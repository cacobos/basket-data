import { load } from "cheerio";

const FEB_MATCH_URL = "https://baloncestoenvivo.feb.es/partido";
const FEB_KEYFACTS_API_URL = "https://intrafeb.feb.es/LiveStats.API/api/v1/KeyFacts";

export type PlayByPlaySource = "api" | "html";

export interface FebPlayByPlayEvent {
  quarter: number | null;
  time: string | null;
  score: string | null;
  teamSide: "local" | "visitante" | "neutral";
  description: string;
  raw: string;
}

export interface FebPlayByPlayResult {
  matchId: string;
  source: PlayByPlaySource;
  rawPlayByPlay: unknown;
  events: FebPlayByPlayEvent[];
}

interface KeyFactsPlayByPlayLine {
  text?: string | null;
  time?: string | null;
  scoreA?: string | null;
  scoreB?: string | null;
  quarter?: string | number | null;
  team?: string | null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function removeBulletDots(value: string): string {
  return value.replace(/[•·]/g, " ").replace(/\s+/g, " ").trim();
}

function parseEventRowText(columns: string[]): {
  description: string;
  time: string | null;
  score: string | null;
} {
  const [left = "", middle = "", right = ""] = columns;
  const middleClean = removeBulletDots(middle);
  const timeMatch = middleClean.match(/\b\d{2}:\d{2}\b/);
  const scoreMatch = middleClean.match(/\b\d{1,3}\s*-\s*\d{1,3}\b/);

  const candidates = [left, right]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => item !== "-");

  const description =
    candidates.length === 0
      ? normalizeText(middleClean.replace(/\b\d{2}:\d{2}\b/g, "").replace(/\b\d{1,3}\s*-\s*\d{1,3}\b/g, ""))
      : (candidates[0] ?? "");

  return {
    description,
    time: timeMatch?.[0] ?? null,
    score: scoreMatch?.[0] ?? null,
  };
}

function parsePlayByPlayFromHtml(html: string): FebPlayByPlayEvent[] {
  const $ = load(html);
  const rows = $("#loader-data .widget-keyfacts .fila");
  const events: FebPlayByPlayEvent[] = [];

  rows.each((_, row) => {
    const className = $(row).attr("class") ?? "";
    const quarterMatch = className.match(/cuarto-(\d+)/);
    const quarter = quarterMatch ? Number(quarterMatch[1]) : null;

    const teamSide = className.includes("ver-local")
      ? "local"
      : className.includes("ver-visitante")
        ? "visitante"
        : "neutral";

    const columns = $(row)
      .find(":scope > .columna .wrapper")
      .map((__, col) => normalizeText($(col).text()))
      .get();

    if (columns.length === 0) {
      return;
    }

    const parsed = parseEventRowText(columns);
    if (!parsed.description) {
      return;
    }

    events.push({
      quarter,
      time: parsed.time,
      score: parsed.score,
      teamSide,
      description: parsed.description,
      raw: normalizeText($(row).text()),
    });
  });

  return events;
}

async function fetchKeyFactsWithToken(matchId: string, token: string): Promise<unknown | null> {
  const response = await fetch(`${FEB_KEYFACTS_API_URL}/${matchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function extractApiPlayByPlay(keyFactsPayload: unknown): unknown {
  if (!keyFactsPayload || typeof keyFactsPayload !== "object") {
    return null;
  }

  const payload = keyFactsPayload as Record<string, unknown>;
  if (payload.PLAYBYPLAY != null) {
    return payload.PLAYBYPLAY;
  }

  return null;
}

function mapApiPlayByPlayToEvents(playByPlay: unknown): FebPlayByPlayEvent[] {
  if (!playByPlay || typeof playByPlay !== "object") {
    return [];
  }

  const lines = (playByPlay as { LINES?: unknown }).LINES;
  if (!Array.isArray(lines)) {
    return [];
  }

  return lines
    .filter((line): line is KeyFactsPlayByPlayLine => !!line && typeof line === "object")
    .map((line) => {
      const score =
        line.scoreA != null && line.scoreB != null && String(line.scoreA) !== "" && String(line.scoreB) !== ""
          ? `${line.scoreA}-${line.scoreB}`
          : null;

      const quarterValue =
        line.quarter == null || line.quarter === ""
          ? null
          : Number.isNaN(Number(line.quarter))
            ? null
            : Number(line.quarter);

      const teamText = (line.team ?? "").toLowerCase();
      const teamSide: FebPlayByPlayEvent["teamSide"] = teamText.includes("local")
        ? "local"
        : teamText.includes("visit")
          ? "visitante"
          : "neutral";

      const description = normalizeText(String(line.text ?? ""));

      return {
        quarter: quarterValue,
        time: line.time ? normalizeText(String(line.time)) : null,
        score,
        teamSide,
        description,
        raw: JSON.stringify(line),
      };
    })
    .filter((event) => event.description.length > 0);
}

export async function getFebPlayByPlay(matchId: string | number): Promise<FebPlayByPlayResult> {
  const normalizedMatchId = String(matchId).trim();
  if (!/^\d+$/.test(normalizedMatchId)) {
    throw new Error("El id de partido debe ser numérico.");
  }

  const matchPageResponse = await fetch(`${FEB_MATCH_URL}/${normalizedMatchId}`);
  if (!matchPageResponse.ok) {
    throw new Error(`No se pudo cargar la página del partido (${matchPageResponse.status}).`);
  }

  const html = await matchPageResponse.text();
  const $ = load(html);
  const token = $("#contentToken > input").attr("value")?.trim() ?? "";

  if (token) {
    const keyFactsPayload = await fetchKeyFactsWithToken(normalizedMatchId, token);
    const playByPlay = extractApiPlayByPlay(keyFactsPayload);

    if (playByPlay != null) {
      const events = mapApiPlayByPlayToEvents(playByPlay);
      return {
        matchId: normalizedMatchId,
        source: "api",
        rawPlayByPlay: playByPlay,
        events,
      };
    }
  }

  const htmlEvents = parsePlayByPlayFromHtml(html);
  return {
    matchId: normalizedMatchId,
    source: "html",
    rawPlayByPlay: null,
    events: htmlEvents,
  };
}