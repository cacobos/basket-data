import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { Subject, type Observable } from 'rxjs';
import { pathToFileURL } from 'url';
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
  changeReason:
    | 'made_field_goal'
    | 'made_last_free_throw'
    | 'turnover'
    | 'defensive_rebound_after_miss'
    | 'period_start';
  resultType:
    | 'made_shot'
    | 'turnover'
    | 'defensive_rebound'
    | 'period_start'
    | 'other';
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

interface CacheItem<T> {
  expiresAt: number;
  value: T;
}

interface RawPlayByPlayLine {
  scoreA?: string | null;
  scoreB?: string | null;
  team?: string | null;
  idTeam?: string | null;
}

interface RawPlayByPlay {
  LINES?: RawPlayByPlayLine[];
}

interface PlayByPlayResponse {
  rawPlayByPlay: RawPlayByPlay | null;
}

interface ScrapUtilsModule {
  getTeamPossessionReport: (
    matchId: string | number,
    ownTeamId: string | number,
  ) => Promise<TeamPossessionReport>;
  getFebPlayByPlay: (matchId: string | number) => Promise<PlayByPlayResponse>;
}

@Injectable()
export class AnalysisService {
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly jobs = new Map<string, AnalysisJob>();
  private readonly events = new Map<string, Subject<JobEvent>>();
  private readonly resultCache = new Map<string, CacheItem<AnalysisResult>>();
  private cachedModule: ScrapUtilsModule | null = null;

  constructor(private readonly febService: FebService) {}

  private async loadScrapUtilsModule(): Promise<ScrapUtilsModule> {
    if (this.cachedModule) {
      return this.cachedModule;
    }

    const modulePath = path.resolve(
      process.cwd(),
      '..',
      'scrap-utils',
      'dist',
      'index.js',
    );
    const moduleUrl = pathToFileURL(modulePath).href;
    const imported = (await import(moduleUrl)) as unknown as ScrapUtilsModule;
    this.cachedModule = imported;
    return imported;
  }

  createJob(request: AnalysisRequest): AnalysisJob {
    const normalized = this.normalizeRequest(request);
    const now = new Date().toISOString();
    const id = this.generateId();

    const job: AnalysisJob = {
      id,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      request: normalized,
    };

    this.jobs.set(id, job);
    this.events.set(id, new Subject<JobEvent>());
    this.emitStatus(id, 'queued', 'Job queued');

    void this.processJob(id);

    return job;
  }

  getJob(jobId: string): AnalysisJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  getJobResult(jobId: string): AnalysisResult {
    const job = this.getJob(jobId);
    if (job.status !== 'completed' || !job.result) {
      throw new NotFoundException(`Job ${jobId} has no completed result yet`);
    }

    return job.result;
  }

  getJobEvents(jobId: string): Observable<JobEvent> {
    const stream = this.events.get(jobId);
    if (!stream) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return stream.asObservable();
  }

  private normalizeRequest(request: AnalysisRequest): AnalysisRequest {
    const uniqueMatchIds = Array.from(
      new Set(
        (request.matchIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const teamId = String(request.teamId ?? '').trim();
    if (!teamId) {
      throw new NotFoundException('teamId is required');
    }

    return {
      matchIds: uniqueMatchIds,
      teamId,
      playerIds: (request.playerIds ?? [])
        .map((id) => String(id).trim())
        .filter(Boolean),
      opponentTeamId: request.opponentTeamId?.trim() || undefined,
      wonOnly: Boolean(request.wonOnly),
      lineupMode: request.lineupMode === 'all' ? 'all' : 'any',
    };
  }

  private ensureLineupHasFivePlayers(lineup: string[]): string[] {
    if (!Array.isArray(lineup)) {
      lineup = [];
    }

    const uniquePlayers = Array.from(
      new Set(lineup.map((id) => String(id).trim()).filter(Boolean)),
    );

    // Si tiene 5 o más, toma los primeros 5 (ya están ordenados alfabéticamente en la fuente)
    if (uniquePlayers.length >= 5) {
      return uniquePlayers.slice(0, 5);
    }

    // Si tiene menos de 5, rellena con placeholders para mantener formato consistente
    const result = [...uniquePlayers];
    for (let i = result.length; i < 5; i++) {
      result.push(`UNKNOWN_${i + 1}`);
    }

    return result;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    try {
      this.updateJobStatus(jobId, 'processing', 'Processing analysis');

      const cacheKey = JSON.stringify(job.request);
      const cached = this.resultCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.completeJob(jobId, cached.value, 'Result served from cache');
        return;
      }

      const scrapUtils = await this.loadScrapUtilsModule();
      const matches: MatchAnalysisResult[] = [];
      let matchIdsToProcess = job.request.matchIds ?? [];
      const teamMatches = await this.febService
        .getTeamMatches(job.request.teamId)
        .catch(() => null);
      const matchMetaById = new Map(
        (teamMatches?.matches ?? []).map((item) => [
          String(item.matchId),
          { isHome: item.isHome, won: item.won },
        ]),
      );

      if (matchIdsToProcess.length === 0) {
        const teamMatches = await this.febService.getTeamMatches(
          job.request.teamId,
        );
        matchIdsToProcess = Array.from(
          new Set(
            (teamMatches.matches ?? [])
              .map((match) => Number(match.matchId))
              .filter((id) => Number.isFinite(id) && id > 0),
          ),
        );

        if (matchIdsToProcess.length === 0) {
          throw new Error(
            'No se encontraron partidos para el equipo seleccionado.',
          );
        }

        job.request.matchIds = matchIdsToProcess;
      }

      for (const matchId of matchIdsToProcess) {
        try {
          const report = await scrapUtils.getTeamPossessionReport(
            matchId,
            job.request.teamId,
          );
          let possessions = report.all;

          if (job.request.opponentTeamId) {
            possessions = possessions.filter(
              (item) => item.opponentTeamId === job.request.opponentTeamId,
            );
          }

          if (job.request.playerIds && job.request.playerIds.length > 0) {
            possessions = possessions.filter((item) => {
              if (job.request.lineupMode === 'all') {
                return job.request.playerIds!.every((playerId) =>
                  item.ownLineup.includes(playerId),
                );
              }

              return job.request.playerIds!.some((playerId) =>
                item.ownLineup.includes(playerId),
              );
            });
          }

          const won = await this.computeMatchWon(
            scrapUtils,
            String(matchId),
            job.request.teamId,
          );
          const matchMeta = matchMetaById.get(String(matchId));
          if (job.request.wonOnly && won !== true) {
            continue;
          }

          const ownOffensePossessions = possessions.filter(
            (item) => item.side === 'own_offense',
          );
          const opponentOffensePossessions = possessions.filter(
            (item) => item.side === 'opponent_offense',
          );
          const ownOffensePoints = ownOffensePossessions.reduce(
            (acc, item) => acc + (item.points || 0),
            0,
          );
          const opponentOffensePoints = opponentOffensePossessions.reduce(
            (acc, item) => acc + (item.points || 0),
            0,
          );
          const ownPointsPerPossession = ownOffensePossessions.length
            ? ownOffensePoints / ownOffensePossessions.length
            : 0;
          const opponentPointsPerPossession = opponentOffensePossessions.length
            ? opponentOffensePoints / opponentOffensePossessions.length
            : 0;

          matches.push({
            matchId: String(matchId),
            isHome: matchMeta?.isHome ?? null,
            won,
            total: possessions.length,
            ownOffense: ownOffensePossessions.length,
            opponentOffense: opponentOffensePossessions.length,
            ownOffensePoints,
            opponentOffensePoints,
            ownPointsPerPossession,
            opponentPointsPerPossession,
            ownOffensePossessions,
            opponentOffensePossessions,
          });
        } catch {
          // Un partido inválido no debe fallar el job completo.
          continue;
        }
      }

      const quintetMap = new Map<
        string,
        { playerIds: string[]; possessions: number; points: number }
      >();
      for (const match of matches) {
        const combinedPossessions = [
          ...match.ownOffensePossessions,
          ...match.opponentOffensePossessions,
        ];

        for (const possession of combinedPossessions) {
          const normalizedLineup = this.ensureLineupHasFivePlayers(
            possession.ownLineup || [],
          ).sort((a, b) => a.localeCompare(b));

          if (normalizedLineup.length === 0) {
            continue;
          }

          const key = normalizedLineup.join('|');
          const current = quintetMap.get(key);
          if (!current) {
            quintetMap.set(key, {
              playerIds: normalizedLineup,
              possessions: 1,
              points: possession.points || 0,
            });
            continue;
          }

          current.possessions += 1;
          current.points += possession.points || 0;
        }
      }

      const quintets: QuintetSummary[] = Array.from(quintetMap.values())
        .map((item) => ({
          playerIds: item.playerIds,
          possessions: item.possessions,
          points: item.points,
          pointsPerPossession: item.possessions
            ? item.points / item.possessions
            : 0,
        }))
        .sort(
          (a, b) =>
            b.pointsPerPossession - a.pointsPerPossession ||
            b.possessions - a.possessions ||
            b.points - a.points,
        );

      const totals = matches.reduce(
        (acc, match) => {
          acc.possessions += match.total;
          acc.ownOffense += match.ownOffense;
          acc.opponentOffense += match.opponentOffense;
          acc.ownPoints += match.ownOffensePoints;
          acc.opponentPoints += match.opponentOffensePoints;
          return acc;
        },
        {
          matches: matches.length,
          possessions: 0,
          ownOffense: 0,
          opponentOffense: 0,
          ownPoints: 0,
          opponentPoints: 0,
          ownPointsPerPossession: 0,
          opponentPointsPerPossession: 0,
        },
      );

      totals.ownPointsPerPossession = totals.ownOffense
        ? totals.ownPoints / totals.ownOffense
        : 0;
      totals.opponentPointsPerPossession = totals.opponentOffense
        ? totals.opponentPoints / totals.opponentOffense
        : 0;

      const result: AnalysisResult = {
        generatedAt: new Date().toISOString(),
        request: job.request,
        totals,
        matches,
        quintets,
      };

      if (result.totals.matches === 0 || result.totals.possessions === 0) {
        throw new Error(
          'No se pudieron procesar posesiones válidas para este equipo con los partidos actuales.',
        );
      }

      this.resultCache.set(cacheKey, {
        expiresAt: Date.now() + this.cacheTtlMs,
        value: result,
      });

      this.completeJob(jobId, result, 'Analysis completed');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown processing error';
      this.failJob(jobId, message);
    }
  }

  private async computeMatchWon(
    scrapUtils: ScrapUtilsModule,
    matchId: string,
    ownTeamId: string,
  ): Promise<boolean | null> {
    const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
    const lines = playByPlay.rawPlayByPlay?.LINES;
    if (!Array.isArray(lines) || lines.length === 0) {
      return null;
    }

    let team1Id: string | null = null;
    let team2Id: string | null = null;
    let finalA: number | null = null;
    let finalB: number | null = null;

    for (const line of lines) {
      if (!line || typeof line !== 'object') {
        continue;
      }

      const teamSlot = line.team ? String(line.team) : '';
      const idTeam = line.idTeam ? String(line.idTeam) : null;
      if (teamSlot === '1' && idTeam) {
        team1Id = idTeam;
      }
      if (teamSlot === '2' && idTeam) {
        team2Id = idTeam;
      }

      if (line.scoreA != null && line.scoreA !== '') {
        finalA = Number(line.scoreA);
      }
      if (line.scoreB != null && line.scoreB !== '') {
        finalB = Number(line.scoreB);
      }
    }

    if (finalA == null || finalB == null || !team1Id || !team2Id) {
      return null;
    }

    if (ownTeamId === team1Id) {
      return finalA > finalB;
    }
    if (ownTeamId === team2Id) {
      return finalB > finalA;
    }

    return null;
  }

  private updateJobStatus(
    jobId: string,
    status: JobStatus,
    message?: string,
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();
    this.emitStatus(jobId, status, message);
  }

  private completeJob(
    jobId: string,
    result: AnalysisResult,
    message?: string,
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'completed';
    job.result = result;
    job.updatedAt = new Date().toISOString();

    this.emitStatus(jobId, 'completed', message);
    this.emitResult(jobId, result);
    this.closeEvents(jobId);
  }

  private failJob(jobId: string, errorMessage: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'failed';
    job.error = errorMessage;
    job.updatedAt = new Date().toISOString();

    const stream = this.events.get(jobId);
    stream?.next({
      type: 'error',
      jobId,
      status: 'failed',
      updatedAt: job.updatedAt,
      message: errorMessage,
    });
    this.closeEvents(jobId);
  }

  private emitStatus(jobId: string, status: JobStatus, message?: string): void {
    const stream = this.events.get(jobId);
    if (!stream) {
      return;
    }

    stream.next({
      type: 'status',
      jobId,
      status,
      updatedAt: new Date().toISOString(),
      message,
    });
  }

  private emitResult(jobId: string, result: AnalysisResult): void {
    const stream = this.events.get(jobId);
    if (!stream) {
      return;
    }

    stream.next({
      type: 'result',
      jobId,
      status: 'completed',
      updatedAt: new Date().toISOString(),
      message: `Result ready. Matches: ${result.totals.matches}`,
    });
  }

  private closeEvents(jobId: string): void {
    const stream = this.events.get(jobId);
    stream?.complete();
    this.events.delete(jobId);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
