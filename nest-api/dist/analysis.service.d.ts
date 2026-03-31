import { type Observable } from 'rxjs';
import { FebService } from './feb.service';
export type LineupMode = 'any' | 'all';
export interface AnalysisRequest {
    matchIds?: number[];
    teamId: string;
    playerIds?: string[];
    opponentTeamId?: string;
    wonOnly?: boolean;
    lineupMode?: LineupMode;
}
export interface TeamPossessionItem {
    index: number;
    quarter: number;
    clock: string;
    side: 'own_offense' | 'opponent_offense';
    ownTeamId: string;
    opponentTeamId: string;
    possessionTeamId: string;
    ownLineup: string[];
    opponentLineup: string[];
    changeReason: 'made_field_goal' | 'made_last_free_throw' | 'turnover' | 'defensive_rebound_after_miss' | 'period_start';
    resultType: 'made_shot' | 'turnover' | 'defensive_rebound' | 'period_start' | 'other';
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
export interface MatchAnalysisResult {
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
}
export interface QuintetSummary {
    playerIds: string[];
    possessions: number;
    points: number;
    pointsPerPossession: number;
}
export interface AnalysisResult {
    generatedAt: string;
    request: AnalysisRequest;
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
    matches: MatchAnalysisResult[];
    quintets: QuintetSummary[];
}
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export interface AnalysisJob {
    id: string;
    status: JobStatus;
    createdAt: string;
    updatedAt: string;
    request: AnalysisRequest;
    result?: AnalysisResult;
    error?: string;
}
interface JobEvent {
    type: 'status' | 'result' | 'error';
    jobId: string;
    status: JobStatus;
    updatedAt: string;
    message?: string;
}
export declare class AnalysisService {
    private readonly febService;
    private readonly cacheTtlMs;
    private readonly jobs;
    private readonly events;
    private readonly resultCache;
    private cachedModule;
    constructor(febService: FebService);
    private loadScrapUtilsModule;
    createJob(request: AnalysisRequest): AnalysisJob;
    getJob(jobId: string): AnalysisJob;
    getJobResult(jobId: string): AnalysisResult;
    getJobEvents(jobId: string): Observable<JobEvent>;
    private normalizeRequest;
    private processJob;
    private computeMatchWon;
    private updateJobStatus;
    private completeJob;
    private failJob;
    private emitStatus;
    private emitResult;
    private closeEvents;
    private generateId;
}
export {};
