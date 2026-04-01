import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from './runtime-config';

export interface AnalysisRequest {
  matchIds: number[];
  teamId: string;
  playerIds?: string[];
  opponentTeamId?: string;
  wonOnly?: boolean;
  lineupMode?: 'any' | 'all';
}

export interface AnalysisJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface TeamPossessionItem {
  index: number;
  quarter: number;
  clock: string;
  side: 'own_offense' | 'opponent_offense';
  changeReason: string;
  points: number;
  ownLineup: string[];
  opponentLineup: string[];
  description: string;
}

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

export interface FebPlayerProfile {
  playerId: string;
  teamId: string;
  name: string;
  photoUrl: string;
  profileUrl: string;
  attributes: Record<string, string>;
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

export interface AnalysisResult {
  generatedAt: string;
  totals: {
    matches: number;
    possessions: number;
    ownOffense: number;
    opponentOffense: number;
    ownPoints: number;
    opponentPoints: number;
    ownPointsPerPossession: number;
    opponentPointsPerPossession: number;
  };
  matches: Array<{
    matchId: string;
    isHome: boolean | null;
    won: boolean | null;
    total: number;
    ownOffense: number;
    opponentOffense: number;
    ownOffensePoints: number;
    opponentOffensePoints: number;
    ownPointsPerPossession: number;
    opponentPointsPerPossession: number;
    ownOffensePossessions: TeamPossessionItem[];
    opponentOffensePossessions: TeamPossessionItem[];
  }>;
  quintets: Array<{
    playerIds: string[];
    possessions: number;
    points: number;
    pointsPerPossession: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AnalysisApiService {
  private readonly apiBase = this.resolveApiBaseUrl();

  constructor(private readonly http: HttpClient) {}

  private resolveApiBaseUrl(): string {
    const runtime = window.__BASKET_DATA_CONFIG__ || {};
    const configured = (runtime.apiBaseUrl || '').trim().replace(/\/$/, '');
    if (configured) {
      return configured;
    }

    return 'http://localhost:3000';
  }

  createJob(payload: AnalysisRequest): Observable<AnalysisJob> {
    return this.http.post<AnalysisJob>(`${this.apiBase}/analysis/jobs`, payload);
  }

  getJob(jobId: string): Observable<AnalysisJob> {
    return this.http.get<AnalysisJob>(`${this.apiBase}/analysis/jobs/${jobId}`);
  }

  getResult(jobId: string): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(`${this.apiBase}/analysis/jobs/${jobId}/result`);
  }

  getAnalysisResult(jobId: string): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(`${this.apiBase}/analysis/jobs/${jobId}/result`);
  }

  getLeagues(): Observable<FebLeague[]> {
    return this.http.get<FebLeague[]>(`${this.apiBase}/feb/leagues`);
  }

  getLeagueTeams(
    leagueId: string,
    seasonId: string,
    slug: string,
    groupId?: string,
  ): Observable<FebLeagueTeamsResult> {
    const params = new URLSearchParams({ seasonId, slug });
    if (groupId) {
      params.set('groupId', groupId);
    }

    return this.http.get<FebLeagueTeamsResult>(
      `${this.apiBase}/feb/leagues/${leagueId}/teams?${params.toString()}`,
    );
  }

  getTeamPlayers(teamId: string): Observable<FebTeamPlayersResult> {
    return this.http.get<FebTeamPlayersResult>(`${this.apiBase}/feb/teams/${teamId}/players`);
  }

  getActionPlayers(teamId: string, matchIds: number[]): Observable<FebActionPlayersResult> {
    const matchIdsParam = matchIds.join(',');
    return this.http.get<FebActionPlayersResult>(
      `${this.apiBase}/feb/teams/${teamId}/action-players?matchIds=${encodeURIComponent(matchIdsParam)}`,
    );
  }

  getTeamMatches(teamId: string): Observable<FebTeamMatchesResult> {
    return this.http.get<FebTeamMatchesResult>(`${this.apiBase}/feb/teams/${teamId}/matches`);
  }

  getPlayerById(playerId: string, teamId: string): Observable<FebPlayerProfile> {
    return this.http.get<FebPlayerProfile>(
      `${this.apiBase}/feb/players/${encodeURIComponent(playerId)}?teamId=${encodeURIComponent(teamId)}`,
    );
  }

  getJobEventsUrl(jobId: string, authToken?: string): string {
    const base = `${this.apiBase}/analysis/jobs/${jobId}/events`;
    if (!authToken) {
      return base;
    }

    return `${base}?authToken=${encodeURIComponent(authToken)}`;
  }
}
