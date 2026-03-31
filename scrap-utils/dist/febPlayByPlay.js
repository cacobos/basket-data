"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFebPlayByPlay = getFebPlayByPlay;
const cheerio_1 = require("cheerio");
const FEB_MATCH_URL = "https://baloncestoenvivo.feb.es/partido";
const FEB_KEYFACTS_API_URL = "https://intrafeb.feb.es/LiveStats.API/api/v1/KeyFacts";
function normalizeText(value) {
    return value.replace(/\s+/g, " ").trim();
}
function removeBulletDots(value) {
    return value.replace(/[•·]/g, " ").replace(/\s+/g, " ").trim();
}
function parseEventRowText(columns) {
    const [left = "", middle = "", right = ""] = columns;
    const middleClean = removeBulletDots(middle);
    const timeMatch = middleClean.match(/\b\d{2}:\d{2}\b/);
    const scoreMatch = middleClean.match(/\b\d{1,3}\s*-\s*\d{1,3}\b/);
    const candidates = [left, right]
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .filter((item) => item !== "-");
    const description = candidates.length === 0
        ? normalizeText(middleClean.replace(/\b\d{2}:\d{2}\b/g, "").replace(/\b\d{1,3}\s*-\s*\d{1,3}\b/g, ""))
        : (candidates[0] ?? "");
    return {
        description,
        time: timeMatch?.[0] ?? null,
        score: scoreMatch?.[0] ?? null,
    };
}
function parsePlayByPlayFromHtml(html) {
    const $ = (0, cheerio_1.load)(html);
    const rows = $("#loader-data .widget-keyfacts .fila");
    const events = [];
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
async function fetchKeyFactsWithToken(matchId, token) {
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
function extractApiPlayByPlay(keyFactsPayload) {
    if (!keyFactsPayload || typeof keyFactsPayload !== "object") {
        return null;
    }
    const payload = keyFactsPayload;
    if (payload.PLAYBYPLAY != null) {
        return payload.PLAYBYPLAY;
    }
    return null;
}
function mapApiPlayByPlayToEvents(playByPlay) {
    if (!playByPlay || typeof playByPlay !== "object") {
        return [];
    }
    const lines = playByPlay.LINES;
    if (!Array.isArray(lines)) {
        return [];
    }
    return lines
        .filter((line) => !!line && typeof line === "object")
        .map((line) => {
        const score = line.scoreA != null && line.scoreB != null && String(line.scoreA) !== "" && String(line.scoreB) !== ""
            ? `${line.scoreA}-${line.scoreB}`
            : null;
        const quarterValue = line.quarter == null || line.quarter === ""
            ? null
            : Number.isNaN(Number(line.quarter))
                ? null
                : Number(line.quarter);
        const teamText = (line.team ?? "").toLowerCase();
        const teamSide = teamText.includes("local")
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
async function getFebPlayByPlay(matchId) {
    const normalizedMatchId = String(matchId).trim();
    if (!/^\d+$/.test(normalizedMatchId)) {
        throw new Error("El id de partido debe ser numérico.");
    }
    const matchPageResponse = await fetch(`${FEB_MATCH_URL}/${normalizedMatchId}`);
    if (!matchPageResponse.ok) {
        throw new Error(`No se pudo cargar la página del partido (${matchPageResponse.status}).`);
    }
    const html = await matchPageResponse.text();
    const $ = (0, cheerio_1.load)(html);
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
//# sourceMappingURL=febPlayByPlay.js.map