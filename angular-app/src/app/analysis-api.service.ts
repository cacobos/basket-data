import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  private readonly apiBase = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

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

  getJobEventsUrl(jobId: string): string {
    return `${this.apiBase}/analysis/jobs/${jobId}/events`;
  }
}
