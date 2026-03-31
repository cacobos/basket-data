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
export declare function getFebPlayByPlay(matchId: string | number): Promise<FebPlayByPlayResult>;
//# sourceMappingURL=febPlayByPlay.d.ts.map