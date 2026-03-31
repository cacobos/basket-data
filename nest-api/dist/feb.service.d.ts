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
export interface FebTeamPlayer {
    playerId: string;
    teamId: string;
    name: string;
    profileUrl: string;
    photoUrl: string;
}
export interface FebTeamPlayersResult {
    teamId: string;
    teamName: string;
    players: FebTeamPlayer[];
}
export interface FebActionPlayer extends FebTeamPlayer {
    appearances: number;
}
export interface FebActionPlayersResult {
    teamId: string;
    matchIds: string[];
    players: FebActionPlayer[];
}
export interface FebTeamMatch {
    matchId: string;
    ownTeamId: string;
    opponentTeamId: string | null;
    isHome: boolean | null;
    won: boolean | null;
    scoreFor: number | null;
    scoreAgainst: number | null;
}
export interface FebTeamMatchesResult {
    teamId: string;
    matches: FebTeamMatch[];
}
export interface FebPlayerProfile {
    playerId: string;
    teamId: string;
    name: string;
    photoUrl: string;
    profileUrl: string;
    attributes: Record<string, string>;
}
export declare class FebService {
    private cachedModule;
    private extractMatchIdFromHref;
    private normalizeFebUrl;
    private extractMatchIdsFromHtml;
    private extractCalendarUrlsFromHtml;
    private extractMatchIdsFromCalendars;
    private loadScrapUtilsModule;
    getLeagues(): Promise<FebLeague[]>;
    getLeagueTeams(leagueId: string | number, seasonId: string | number, slug: string, groupId?: string): Promise<FebLeagueTeamsResult>;
    getTeamPlayers(teamId: string | number): Promise<FebTeamPlayersResult>;
    getActionPlayers(teamId: string | number, matchIds: Array<string | number>): Promise<FebActionPlayersResult>;
    getTeamMatches(teamId: string | number): Promise<FebTeamMatchesResult>;
    getPlayerById(playerId: string | number, teamId?: string): Promise<FebPlayerProfile>;
}
