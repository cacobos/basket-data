export interface FebLeague {
    leagueId: string;
    seasonId: string;
    slug: string;
    statsUrl: string;
}
export interface FebLeagueGroup {
    groupId: string;
    name: string;
    selected: boolean;
}
export interface FebLeagueTeam {
    teamId: string;
    name: string;
    teamUrl: string;
}
export interface FebLeagueTeamsResult {
    leagueId: string;
    seasonId: string;
    slug: string;
    selectedGroupId: string;
    groups: FebLeagueGroup[];
    teams: FebLeagueTeam[];
}
export declare function getFebLeagues(): Promise<FebLeague[]>;
export declare function getFebLeagueTeams(leagueId: string | number, seasonId: string | number, slug: string, groupId?: string | number): Promise<FebLeagueTeamsResult>;
//# sourceMappingURL=febLeagues.d.ts.map