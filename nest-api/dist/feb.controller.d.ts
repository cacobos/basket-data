import type { Response } from 'express';
import { FebActionPlayersResult, FebLeague, FebLeagueTeamsResult, FebPlayerProfile, FebService, FebTeamMatchesResult, FebTeamPlayersResult } from './feb.service';
export declare class FebController {
    private readonly febService;
    constructor(febService: FebService);
    proxyImage(rawUrl: string, res: Response): Promise<void>;
    getLeagues(): Promise<FebLeague[]>;
    getLeagueTeams(leagueId: number, seasonId?: string, slug?: string, groupId?: string): Promise<FebLeagueTeamsResult>;
    getTeamPlayers(teamId: number): Promise<FebTeamPlayersResult>;
    getActionPlayers(teamId: number, matchIds?: string): Promise<FebActionPlayersResult>;
    getTeamMatches(teamId: number): Promise<FebTeamMatchesResult>;
    getPlayerById(playerId: number, teamId?: string): Promise<FebPlayerProfile>;
}
