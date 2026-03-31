import { type FebPlayByPlayResult } from "./febPlayByPlay";
export type PossessionResultType = "made_shot" | "turnover" | "defensive_rebound" | "period_start" | "other";
export type PossessionChangeReason = "made_field_goal" | "made_last_free_throw" | "turnover" | "defensive_rebound_after_miss" | "period_start";
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
export declare function buildFebPossessionTimeline(result: FebPlayByPlayResult): FebPossessionItem[];
export declare function getFebPossessionTimeline(matchId: string | number): Promise<FebPossessionItem[]>;
export declare function splitTeamPossessions(possessions: FebPossessionItem[], ownTeamId: string, matchId: string): TeamPossessionReport;
export declare function getTeamPossessionReport(matchId: string | number, ownTeamId: string | number): Promise<TeamPossessionReport>;
//# sourceMappingURL=febPossessions.d.ts.map