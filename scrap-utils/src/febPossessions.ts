import { getFebPlayByPlay, type FebPlayByPlayResult } from "./febPlayByPlay";

export type PossessionResultType =
  | "made_shot"
  | "turnover"
  | "defensive_rebound"
  | "period_start"
  | "other";

export type PossessionChangeReason =
  | "made_field_goal"
  | "made_last_free_throw"
  | "turnover"
  | "defensive_rebound_after_miss"
  | "period_start";

export interface FebPossessionItem {
  index: number;
  quarter: number;
  time: string;
  teamAId: string;
  teamBId: string;
  teamAOnCourt: string[];
  teamBOnCourt: string[];
  possessionTeamId: string;
  triggerTeamId: string | null;
  triggerPlayerId: string | null;
  resultType: PossessionResultType;
  changeReason: PossessionChangeReason;
  points: number;
  assistPlayerId: string | null;
  reboundPlayerId: string | null;
  stealPlayerId: string | null;
  action: string;
  description: string;
  relatedDescriptions: string[];
}

export type TeamPossessionSide = "own_offense" | "opponent_offense";

export interface TeamPossessionItem {
  index: number;
  quarter: number;
  clock: string;
  side: TeamPossessionSide;
  ownTeamId: string;
  opponentTeamId: string;
  possessionTeamId: string;
  ownLineup: string[];
  opponentLineup: string[];
  changeReason: PossessionChangeReason;
  resultType: PossessionResultType;
  points: number;
  triggerTeamId: string | null;
  triggerPlayerId: string | null;
  assistPlayerId: string | null;
  reboundPlayerId: string | null;
  stealPlayerId: string | null;
  action: string;
  description: string;
  relatedDescriptions: string[];
}

export interface TeamPossessionReport {
  matchId: string;
  ownTeamId: string;
  opponentTeamId: string;
  ownOffense: TeamPossessionItem[];
  opponentOffense: TeamPossessionItem[];
  all: TeamPossessionItem[];
}

interface RawLine {
  num: number;
  quarter: number;
  time: string;
  action: string;
  text: string;
  idTeam: string | null;
  idPlayer: string | null;
  scoreA: string | null;
  scoreB: string | null;
  team: string | null;
}

interface PendingMiss {
  teamId: string;
  quarter: number;
  time: string;
  lineNum: number;
  carriedPoints: number;
  missDescription: string;
}

interface PendingFreeThrowContext {
  teamId: string;
  carriedPoints: number;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function timeToSeconds(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return -1;
  }

  return Number(m[1]) * 60 + Number(m[2]);
}

function parseRawLines(result: FebPlayByPlayResult): RawLine[] {
  const lines: RawLine[] = [];

  for (const event of result.events) {
    if (!event.raw.startsWith("{")) {
      continue;
    }

    try {
      const parsed = JSON.parse(event.raw) as Record<string, unknown>;
      const num = Number(parsed.num);
      const quarter = Number(parsed.quarter);
      const text = normalizeText(String(parsed.text ?? ""));
      const time = normalizeText(String(parsed.time ?? ""));
      const action = normalizeText(String(parsed.action ?? "")).toLowerCase();

      if (!Number.isFinite(num) || !Number.isFinite(quarter) || !time || !action || !text) {
        continue;
      }

      lines.push({
        num,
        quarter,
        time,
        action,
        text,
        idTeam: parsed.idTeam ? String(parsed.idTeam) : null,
        idPlayer: parsed.idPlayer ? String(parsed.idPlayer) : null,
        scoreA: parsed.scoreA ? String(parsed.scoreA) : null,
        scoreB: parsed.scoreB ? String(parsed.scoreB) : null,
        team: parsed.team ? String(parsed.team) : null,
      });
    } catch {
      // Skip malformed rows.
    }
  }

  return lines
    .filter((line) => line.quarter >= 1)
    .sort((a, b) => a.num - b.num);
}

function isSubIn(line: RawLine): boolean {
  return line.action === "subst" && /entra a pista/i.test(line.text);
}

function isSubOut(line: RawLine): boolean {
  return line.action === "subst" && /sale de pista/i.test(line.text);
}

function isMadeFieldGoal(line: RawLine): boolean {
  return line.action === "shoot" && /anotado/i.test(line.text);
}

function isMissedFieldGoal(line: RawLine): boolean {
  return line.action === "shoot" && /fallado/i.test(line.text);
}

function isTurnover(line: RawLine): boolean {
  return line.action === "lose";
}

function isRebound(line: RawLine): boolean {
  return line.action === "rebound";
}

function isFreeThrow(line: RawLine): boolean {
  return line.action === "fthrow";
}

function isMadeFreeThrow(line: RawLine): boolean {
  return isFreeThrow(line) && /anotado/i.test(line.text);
}

function isMissedFreeThrow(line: RawLine): boolean {
  return isFreeThrow(line) && /fallado/i.test(line.text);
}

function inferPointsFromText(line: RawLine): number {
  if (line.action === "fthrow") {
    return /anotado/i.test(line.text) ? 1 : 0;
  }

  const shotMatch = line.text.match(/tiro de\s*(\d)\s+anotado/i);
  if (shotMatch) {
    return Number(shotMatch[1]);
  }

  return /anotado/i.test(line.text) ? 2 : 0;
}

function otherTeam(teamId: string, teamAId: string, teamBId: string): string {
  return teamId === teamAId ? teamBId : teamAId;
}

function isLiveBallRestartAction(action: string): boolean {
  return ["shoot", "lose", "rebound", "recovery", "period"].includes(action);
}

function isLastFreeThrowInSequence(lines: RawLine[], index: number): boolean {
  const current = lines[index];
  if (!current || !current.idTeam || !isFreeThrow(current)) {
    return true;
  }

  for (let i = index + 1; i < lines.length; i += 1) {
    const candidate = lines[i];
    if (!candidate) {
      continue;
    }

    if (candidate.quarter !== current.quarter) {
      return true;
    }

    if (candidate.action === "fthrow") {
      if (candidate.idTeam === current.idTeam) {
        return false;
      }

      return true;
    }

    if (isLiveBallRestartAction(candidate.action)) {
      return true;
    }
  }

  return true;
}

function hasAndOneContinuation(lines: RawLine[], index: number): boolean {
  const current = lines[index];
  if (!current || !isMadeFieldGoal(current) || !current.idTeam) {
    return false;
  }

  const currentTime = timeToSeconds(current.time);

  for (let i = index + 1; i < lines.length && i <= index + 8; i += 1) {
    const candidate = lines[i];
    if (!candidate) {
      continue;
    }

    if (candidate.quarter !== current.quarter) {
      return false;
    }

    if (isFreeThrow(candidate) && candidate.idTeam === current.idTeam) {
      return true;
    }

    if (isLiveBallRestartAction(candidate.action)) {
      return false;
    }

    const dt = Math.abs(currentTime - timeToSeconds(candidate.time));
    if (dt > 8) {
      return false;
    }
  }

  return false;
}

function pushLineupPlayer(
  teamLineup: Set<string>,
  playerId: string,
  lastSeenOrder: Map<string, number>,
  eventOrder: number,
): void {
  teamLineup.add(playerId);
  lastSeenOrder.set(playerId, eventOrder);

  if (teamLineup.size <= 5) {
    return;
  }

  // Keep the five most recently seen players when the feed arrives with incomplete lineup context.
  const candidates = Array.from(teamLineup.values())
    .map((id) => ({ id, seen: lastSeenOrder.get(id) ?? -1 }))
    .sort((a, b) => b.seen - a.seen)
    .slice(0, 5)
    .map((item) => item.id);

  teamLineup.clear();
  for (const id of candidates) {
    teamLineup.add(id);
  }
}

function cloneSorted(set: Set<string>): string[] {
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

function ensureLineupHasFivePlayers(
  teamLineup: Set<string>,
  lastSeenOrder: Map<string, number>,
): void {
  // Si ya tiene 5 o más, recorta a los 5 más recientes
  if (teamLineup.size >= 5) {
    const best = Array.from(teamLineup.values())
      .map((id) => ({ id, seen: lastSeenOrder.get(id) ?? -1 }))
      .sort((a, b) => b.seen - a.seen)
      .slice(0, 5)
      .map((item) => item.id);
    teamLineup.clear();
    for (const id of best) {
      teamLineup.add(id);
    }
    return;
  }

  // Si tiene menos de 5, intenta completar con los más recientes históricos
  const fallbackCandidates = Array.from(lastSeenOrder.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([playerId]) => playerId)
    .filter((playerId) => !teamLineup.has(playerId));

  for (const playerId of fallbackCandidates) {
    teamLineup.add(playerId);
    if (teamLineup.size >= 5) {
      break;
    }
  }

  // Si tras llenar con históricos aún tiene menos de 5, es dato corrupto/incompleto,
  // pero dejamos lo que hay para no silenciar el problema.
}

function seedInitialLineups(
  lines: RawLine[],
  teamAId: string,
  teamBId: string,
  lineupA: Set<string>,
  lineupB: Set<string>,
  seenA: Map<string, number>,
  seenB: Map<string, number>,
): void {
  for (const line of lines) {
    if (!line.idTeam || !line.idPlayer) {
      continue;
    }

    if (line.idTeam === teamAId && lineupA.size < 5) {
      pushLineupPlayer(lineupA, line.idPlayer, seenA, line.num);
    }

    if (line.idTeam === teamBId && lineupB.size < 5) {
      pushLineupPlayer(lineupB, line.idPlayer, seenB, line.num);
    }

    if (lineupA.size >= 5 && lineupB.size >= 5) {
      return;
    }
  }
}

function buildRelatedDescriptions(lines: RawLine[], index: number): { assistPlayerId: string | null; stealPlayerId: string | null; related: string[] } {
  const base = lines[index];
  if (!base) {
    return { assistPlayerId: null, stealPlayerId: null, related: [] };
  }

  const related: string[] = [];
  let assistPlayerId: string | null = null;
  let stealPlayerId: string | null = null;

  for (let i = index + 1; i < lines.length && i <= index + 4; i += 1) {
    const candidate = lines[i];
    if (!candidate) {
      continue;
    }

    if (candidate.quarter !== base.quarter || candidate.time !== base.time) {
      break;
    }

    related.push(candidate.text);

    if (candidate.action === "assist" && candidate.idPlayer) {
      assistPlayerId = candidate.idPlayer;
    }

    if (candidate.action === "recovery" && candidate.idPlayer) {
      stealPlayerId = candidate.idPlayer;
    }
  }

  return { assistPlayerId, stealPlayerId, related };
}

export function buildFebPossessionTimeline(result: FebPlayByPlayResult): FebPossessionItem[] {
  const lines = parseRawLines(result);
  if (lines.length === 0) {
    return [];
  }

  const teamIds = Array.from(new Set(lines.map((line) => line.idTeam).filter((id): id is string => Boolean(id))));
  if (teamIds.length < 2) {
    return [];
  }

  const teamAId = teamIds[0];
  const teamBId = teamIds[1];
  if (!teamAId || !teamBId) {
    return [];
  }

  const lineupA = new Set<string>();
  const lineupB = new Set<string>();
  const seenA = new Map<string, number>();
  const seenB = new Map<string, number>();

  seedInitialLineups(lines, teamAId, teamBId, lineupA, lineupB, seenA, seenB);

  let pendingMiss: PendingMiss | null = null;
  let pendingFreeThrowContext: PendingFreeThrowContext | null = null;
  let possessionTeamId: string | null = null;

  const possessions: FebPossessionItem[] = [];

  const addPossession = (
    lineIndex: number,
    line: RawLine,
    newPossessionTeamId: string,
    resultType: PossessionResultType,
    changeReason: PossessionChangeReason,
    points: number,
    reboundPlayerId: string | null,
    extraRelatedDescriptions: string[] = [],
  ): void => {
    ensureLineupHasFivePlayers(lineupA, seenA);
    ensureLineupHasFivePlayers(lineupB, seenB);

    const related = buildRelatedDescriptions(lines, lineIndex);
    const mergedRelated = [...extraRelatedDescriptions, ...related.related];

    possessions.push({
      index: possessions.length + 1,
      quarter: line.quarter,
      time: line.time,
      teamAId,
      teamBId,
      teamAOnCourt: cloneSorted(lineupA),
      teamBOnCourt: cloneSorted(lineupB),
      possessionTeamId: newPossessionTeamId,
      triggerTeamId: line.idTeam,
      triggerPlayerId: line.idPlayer,
      resultType,
      changeReason,
      points,
      assistPlayerId: related.assistPlayerId,
      reboundPlayerId,
      stealPlayerId: related.stealPlayerId,
      action: line.action,
      description: line.text,
      relatedDescriptions: mergedRelated,
    });
  };

  const shouldInferDefensiveRebound = (line: RawLine): boolean => {
    if (!pendingMiss) {
      return false;
    }

    if (line.action === "rebound") {
      return false;
    }

    // Ignore admin events that can happen between the miss and the rebound.
    if (line.action === "subst" || line.action === "timeout" || line.action === "foul" || line.action === "assist") {
      return false;
    }

    return isLiveBallRestartAction(line.action) || line.action === "fthrow";
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }

    const beforeTrackingWindow = line.quarter === 1 && timeToSeconds(line.time) > 600;

    if (line.idTeam && line.idPlayer) {
      if (line.idTeam === teamAId) {
        pushLineupPlayer(lineupA, line.idPlayer, seenA, line.num);
      } else if (line.idTeam === teamBId) {
        pushLineupPlayer(lineupB, line.idPlayer, seenB, line.num);
      }
    }

    if (isSubOut(line) && line.idTeam && line.idPlayer) {
      if (line.idTeam === teamAId) {
        lineupA.delete(line.idPlayer);
      } else if (line.idTeam === teamBId) {
        lineupB.delete(line.idPlayer);
      }
      continue;
    }

    if (isSubIn(line) && line.idTeam && line.idPlayer) {
      if (line.idTeam === teamAId) {
        pushLineupPlayer(lineupA, line.idPlayer, seenA, line.num);
      } else if (line.idTeam === teamBId) {
        pushLineupPlayer(lineupB, line.idPlayer, seenB, line.num);
      }
      continue;
    }

    if (beforeTrackingWindow) {
      continue;
    }

    if (shouldInferDefensiveRebound(line) && pendingMiss) {
      const inferredTeamId = otherTeam(pendingMiss.teamId, teamAId, teamBId);
      const inferredLine: RawLine = {
        num: line.num,
        quarter: line.quarter,
        time: line.time,
        action: "rebound",
        text: "Defensive rebound inferred (missing rebound event)",
        idTeam: inferredTeamId,
        idPlayer: null,
        scoreA: null,
        scoreB: null,
        team: null,
      };

      possessionTeamId = inferredTeamId;
      addPossession(
        i,
        inferredLine,
        possessionTeamId,
        "defensive_rebound",
        "defensive_rebound_after_miss",
        pendingMiss.carriedPoints,
        null,
        [pendingMiss.missDescription],
      );
      pendingMiss = null;
    }

    if (isFreeThrow(line) && line.idTeam) {
      const isLast = isLastFreeThrowInSequence(lines, i);
      if (!isLast) {
        continue;
      }

      const carriedPoints = pendingFreeThrowContext?.teamId === line.idTeam ? pendingFreeThrowContext.carriedPoints : 0;
      if (isMadeFreeThrow(line)) {
        const points = carriedPoints + 1;
        possessionTeamId = otherTeam(line.idTeam, teamAId, teamBId);
        addPossession(i, line, possessionTeamId, "made_shot", "made_last_free_throw", points, null);
      } else if (isMissedFreeThrow(line)) {
        pendingMiss = {
          teamId: line.idTeam,
          quarter: line.quarter,
          time: line.time,
          lineNum: line.num,
          carriedPoints,
          missDescription: line.text,
        };
      }

      pendingFreeThrowContext = null;
      continue;
    }

    if (isMissedFieldGoal(line) && line.idTeam) {
      pendingMiss = {
        teamId: line.idTeam,
        quarter: line.quarter,
        time: line.time,
        lineNum: line.num,
        carriedPoints: 0,
        missDescription: line.text,
      };
      continue;
    }

    if (isRebound(line) && pendingMiss && line.idTeam) {
      const defensive = line.idTeam !== pendingMiss.teamId;
      if (defensive) {
        possessionTeamId = line.idTeam;
        addPossession(
          i,
          line,
          possessionTeamId,
          "defensive_rebound",
          "defensive_rebound_after_miss",
          pendingMiss.carriedPoints,
          line.idPlayer ?? null,
          [pendingMiss.missDescription],
        );
      }
      pendingMiss = null;
      continue;
    }

    if (isMadeFieldGoal(line) && line.idTeam) {
      const points = inferPointsFromText(line);
      if (hasAndOneContinuation(lines, i)) {
        pendingFreeThrowContext = {
          teamId: line.idTeam,
          carriedPoints: points,
        };
        continue;
      }

      possessionTeamId = otherTeam(line.idTeam, teamAId, teamBId);
      addPossession(i, line, possessionTeamId, "made_shot", "made_field_goal", points, null);
      pendingMiss = null;
      pendingFreeThrowContext = null;
      continue;
    }

    if (isTurnover(line) && line.idTeam) {
      possessionTeamId = otherTeam(line.idTeam, teamAId, teamBId);
      addPossession(i, line, possessionTeamId, "turnover", "turnover", 0, null);
      pendingMiss = null;
      pendingFreeThrowContext = null;
      continue;
    }

    if (line.action === "period") {
      pendingMiss = null;
      pendingFreeThrowContext = null;
      continue;
    }
  }

  return possessions;
}

export async function getFebPossessionTimeline(matchId: string | number): Promise<FebPossessionItem[]> {
  const playByPlay = await getFebPlayByPlay(matchId);
  return buildFebPossessionTimeline(playByPlay);
}

function adaptToTeamPossession(item: FebPossessionItem, ownTeamId: string): TeamPossessionItem {
  const isTeamAOwn = item.teamAId === ownTeamId;
  const isTeamBOwn = item.teamBId === ownTeamId;

  if (!isTeamAOwn && !isTeamBOwn) {
    throw new Error(`El equipo ${ownTeamId} no participa en el partido.`);
  }

  const opponentTeamId = isTeamAOwn ? item.teamBId : item.teamAId;
  const ownLineup = isTeamAOwn ? item.teamAOnCourt : item.teamBOnCourt;
  const opponentLineup = isTeamAOwn ? item.teamBOnCourt : item.teamAOnCourt;
  const side: TeamPossessionSide = item.possessionTeamId === ownTeamId ? "own_offense" : "opponent_offense";

  return {
    index: item.index,
    quarter: item.quarter,
    clock: item.time,
    side,
    ownTeamId,
    opponentTeamId,
    possessionTeamId: item.possessionTeamId,
    ownLineup,
    opponentLineup,
    changeReason: item.changeReason,
    resultType: item.resultType,
    points: item.points,
    triggerTeamId: item.triggerTeamId,
    triggerPlayerId: item.triggerPlayerId,
    assistPlayerId: item.assistPlayerId,
    reboundPlayerId: item.reboundPlayerId,
    stealPlayerId: item.stealPlayerId,
    action: item.action,
    description: item.description,
    relatedDescriptions: item.relatedDescriptions,
  };
}

export function splitTeamPossessions(possessions: FebPossessionItem[], ownTeamId: string, matchId: string): TeamPossessionReport {
  if (possessions.length === 0) {
    return {
      matchId,
      ownTeamId,
      opponentTeamId: "",
      ownOffense: [],
      opponentOffense: [],
      all: [],
    };
  }

  const all = possessions.map((item) => adaptToTeamPossession(item, ownTeamId));
  const opponentTeamId = all[0]?.opponentTeamId ?? "";
  const ownOffense = all.filter((item) => item.side === "own_offense");
  const opponentOffense = all.filter((item) => item.side === "opponent_offense");

  return {
    matchId,
    ownTeamId,
    opponentTeamId,
    ownOffense,
    opponentOffense,
    all,
  };
}

export async function getTeamPossessionReport(matchId: string | number, ownTeamId: string | number): Promise<TeamPossessionReport> {
  const normalizedMatchId = String(matchId).trim();
  const normalizedTeamId = String(ownTeamId).trim();
  const possessions = await getFebPossessionTimeline(normalizedMatchId);
  return splitTeamPossessions(possessions, normalizedTeamId, normalizedMatchId);
}
