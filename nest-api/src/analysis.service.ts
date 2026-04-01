import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';
import { pathToFileURL } from 'url';
import {
  AnalysisJobsStore,
  type DbJsonObject,
  StoredAnalysisJob,
} from './analysis-jobs.store';
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
  launchedBy?: JobLauncher | null;
}

export interface JobLauncher {
  userId?: string;
  email?: string;
  displayName?: string;
  provider?: string;
}

export interface TeamSearchLock {
  teamId: string;
  jobId: string;
  status: JobStatus;
  createdAt: string;
  expiresAt: string;
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
  private readonly jobTtlMs = 24 * 60 * 60 * 1000;
  private readonly events = new Map<string, Subject<JobEvent>>();
  private readonly resultCache = new Map<string, CacheItem<AnalysisResult>>();
  private cachedModule: ScrapUtilsModule | null = null;

  constructor(
    private readonly febService: FebService,
    private readonly jobsStore: AnalysisJobsStore,
  ) {}

  private async pruneExpiredJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - this.jobTtlMs);
    const deletedIds = await this.jobsStore.deleteBefore(cutoff);

    for (const jobId of deletedIds) {
      this.closeEvents(jobId);
    }
  }

  private getJobExpiryIso(job: AnalysisJob): string {
    const createdAt = new Date(job.createdAt).getTime();
    return new Date(createdAt + this.jobTtlMs).toISOString();
  }

  async listJobs(): Promise<AnalysisJob[]> {
    await this.pruneExpiredJobs();
    const cutoff = new Date(Date.now() - this.jobTtlMs);
    const jobs = await this.jobsStore.listJobsSince(cutoff);
    return jobs.map((job) => this.mapStoredJob(job));
  }

  async listTeamLocks(): Promise<TeamSearchLock[]> {
    const jobs = await this.listJobs();
    const latestByTeam = new Map<string, AnalysisJob>();

    for (const job of jobs) {
      const teamId = String(job.request.teamId ?? '').trim();
      if (!teamId) {
        continue;
      }

      const current = latestByTeam.get(teamId);
      if (!current) {
        latestByTeam.set(teamId, job);
        continue;
      }

      const currentTs = new Date(current.createdAt).getTime();
      const candidateTs = new Date(job.createdAt).getTime();
      if (candidateTs > currentTs) {
        latestByTeam.set(teamId, job);
      }
    }

    return Array.from(latestByTeam.entries())
      .map(([teamId, job]) => ({
        teamId,
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        expiresAt: this.getJobExpiryIso(job),
      }))
      .sort((a, b) => a.teamId.localeCompare(b.teamId));
  }

  private async getTeamLock(teamId: string): Promise<TeamSearchLock | null> {
    const lock = (await this.listTeamLocks()).find(
      (item) => item.teamId === teamId,
    );
    return lock ?? null;
  }

  private async loadScrapUtilsModule(): Promise<ScrapUtilsModule> {
    if (this.cachedModule) {
      return this.cachedModule;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'api', 'scrap-utils', 'index.js'),
      path.resolve(process.cwd(), 'api', 'scrap-utils', 'dist', 'index.js'),
      path.resolve(process.cwd(), 'scrap-utils', 'dist', 'index.js'),
      path.resolve(process.cwd(), '..', 'scrap-utils', 'dist', 'index.js'),
      path.resolve(
        process.cwd(),
        '..',
        '..',
        'scrap-utils',
        'dist',
        'index.js',
      ),
    ];

    const modulePath = candidatePaths.find((candidate) =>
      existsSync(candidate),
    );
    if (!modulePath) {
      throw new NotFoundException(
        'No se encontro scrap-utils/dist/index.js. Ejecuta build de scrap-utils o revisa el despliegue.',
      );
    }

    const moduleUrl = pathToFileURL(modulePath).href;
    const imported = (await import(moduleUrl)) as unknown as ScrapUtilsModule;
    this.cachedModule = imported;
    return imported;
  }

  async createJob(
    request: AnalysisRequest,
    launchedBy: JobLauncher | null,
  ): Promise<AnalysisJob> {
    await this.pruneExpiredJobs();
    const normalized = this.normalizeRequest(request);

    const lock = await this.getTeamLock(normalized.teamId);
    if (lock) {
      throw new ConflictException(
        `Ya existe una busqueda para este equipo hasta ${lock.expiresAt}.`,
      );
    }

    const id = this.generateId();
    const created = await this.jobsStore.createJob(
      id,
      'queued',
      this.serializeRequest(normalized),
      this.serializeLauncher(launchedBy),
    );

    this.ensureEventStream(created.id);
    this.emitStatus(
      created.id,
      'queued',
      'Job queued',
      created.updatedAt.toISOString(),
    );
    void this.processJob(created.id);

    return this.mapStoredJob(created);
  }

  async getJob(jobId: string): Promise<AnalysisJob> {
    await this.pruneExpiredJobs();
    const job = await this.jobsStore.getJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return this.mapStoredJob(job);
  }

  async getJobResult(jobId: string): Promise<AnalysisResult> {
    await this.pruneExpiredJobs();
    const job = await this.getJob(jobId);
    if (job.status !== 'completed' || !job.result) {
      throw new NotFoundException(`Job ${jobId} has no completed result yet`);
    }

    return job.result;
  }

  getJobEvents(jobId: string): Observable<JobEvent> {
    return new Observable<JobEvent>((subscriber) => {
      let closed = false;
      let streamSub: { unsubscribe: () => void } | null = null;
      let lastKey = '';
      let pollHandle: ReturnType<typeof setInterval> | undefined;

      const emitSnapshot = (job: AnalysisJob): void => {
        const key = `${job.status}|${job.updatedAt}|${job.error || ''}`;
        if (key === lastKey) {
          return;
        }

        lastKey = key;
        subscriber.next({
          type: job.status === 'failed' ? 'error' : 'status',
          jobId,
          status: job.status,
          updatedAt: job.updatedAt,
          message: job.error,
        });

        if (job.status === 'completed') {
          subscriber.next({
            type: 'result',
            jobId,
            status: 'completed',
            updatedAt: job.updatedAt,
            message: 'Result ready',
          });
          subscriber.complete();
        }

        if (job.status === 'failed') {
          subscriber.complete();
        }
      };

      const bootstrap = async (): Promise<void> => {
        const job = await this.getJob(jobId);
        emitSnapshot(job);

        if (job.status === 'completed' || job.status === 'failed') {
          return;
        }

        pollHandle = setInterval(() => {
          void this.getJob(jobId)
            .then((latest) => {
              if (!closed) {
                emitSnapshot(latest);
              }
            })
            .catch(() => undefined);
        }, 3000);

        const stream = this.ensureEventStream(jobId);
        streamSub = stream.subscribe({
          next: (event) => {
            if (!closed) {
              subscriber.next(event);
            }
          },
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      };

      void bootstrap().catch((error) => subscriber.error(error));

      return () => {
        closed = true;
        streamSub?.unsubscribe();
        if (pollHandle) {
          clearInterval(pollHandle);
          pollHandle = undefined;
        }
      };
    });
  }

  private mapStoredJob(job: StoredAnalysisJob): AnalysisJob {
    const request = this.deserializeRequest(job.request);
    const result = this.deserializeResult(job.result);
    const status = this.normalizeJobStatus(job.status);

    return {
      id: job.id,
      status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      request,
      result,
      error: job.error ?? undefined,
      launchedBy: this.normalizeLauncher(job.launchedBy),
    };
  }

  private normalizeLauncher(value: unknown): JobLauncher | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    const launcher: JobLauncher = {};

    if (typeof candidate.userId === 'string' && candidate.userId.trim()) {
      launcher.userId = candidate.userId.trim();
    }

    if (typeof candidate.email === 'string' && candidate.email.trim()) {
      launcher.email = candidate.email.trim();
    }

    if (
      typeof candidate.displayName === 'string' &&
      candidate.displayName.trim()
    ) {
      launcher.displayName = candidate.displayName.trim();
    }

    if (typeof candidate.provider === 'string' && candidate.provider.trim()) {
      launcher.provider = candidate.provider.trim();
    }

    return Object.keys(launcher).length > 0 ? launcher : null;
  }

  private serializeRequest(request: AnalysisRequest): DbJsonObject {
    const payload: DbJsonObject = {
      matchIds: request.matchIds ?? [],
      teamId: request.teamId,
      playerIds: request.playerIds ?? [],
      wonOnly: Boolean(request.wonOnly),
      lineupMode: request.lineupMode ?? 'any',
    };

    if (request.opponentTeamId) {
      payload.opponentTeamId = request.opponentTeamId;
    }

    return payload;
  }

  private serializeLauncher(launcher: JobLauncher | null): DbJsonObject | null {
    if (!launcher) {
      return null;
    }

    const payload: DbJsonObject = {};

    if (launcher.userId) {
      payload.userId = launcher.userId;
    }

    if (launcher.email) {
      payload.email = launcher.email;
    }

    if (launcher.displayName) {
      payload.displayName = launcher.displayName;
    }

    if (launcher.provider) {
      payload.provider = launcher.provider;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private deserializeRequest(raw: unknown): AnalysisRequest {
    const record =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    const readString = (value: unknown): string =>
      typeof value === 'string'
        ? value.trim()
        : value == null
          ? ''
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value).trim()
            : '';

    return {
      matchIds: Array.isArray(record.matchIds)
        ? record.matchIds
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : [],
      teamId: readString(record.teamId),
      playerIds: Array.isArray(record.playerIds)
        ? record.playerIds.map((value) => String(value)).filter(Boolean)
        : [],
      opponentTeamId: readString(record.opponentTeamId) || undefined,
      wonOnly: Boolean(record.wonOnly),
      lineupMode: record.lineupMode === 'all' ? 'all' : 'any',
    };
  }

  private deserializeResult(raw: unknown): AnalysisResult | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined;
    }

    return raw as AnalysisResult;
  }

  private normalizeJobStatus(status: string): JobStatus {
    if (
      status === 'queued' ||
      status === 'processing' ||
      status === 'completed' ||
      status === 'failed'
    ) {
      return status;
    }

    return 'failed';
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
    const uniquePlayers = Array.from(
      new Set((lineup ?? []).map((id) => String(id).trim()).filter(Boolean)),
    );

    if (uniquePlayers.length >= 5) {
      return uniquePlayers.slice(0, 5);
    }

    const result = [...uniquePlayers];
    for (let i = result.length; i < 5; i++) {
      result.push(`UNKNOWN_${i + 1}`);
    }

    return result;
  }

  private async processJob(jobId: string): Promise<void> {
    let job: AnalysisJob;
    try {
      job = await this.getJob(jobId);
    } catch {
      return;
    }

    try {
      await this.updateJobStatus(jobId, 'processing', 'Processing analysis');

      const cacheKey = JSON.stringify(job.request);
      const cached = this.resultCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        await this.completeJob(jobId, cached.value, 'Result served from cache');
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
        const fetchedTeamMatches = await this.febService.getTeamMatches(
          job.request.teamId,
        );
        matchIdsToProcess = Array.from(
          new Set(
            (fetchedTeamMatches.matches ?? [])
              .map((match) => Number(match.matchId))
              .filter((id) => Number.isFinite(id) && id > 0),
          ),
        );

        if (matchIdsToProcess.length === 0) {
          console.error(
            `[analysis] No matches found after getTeamMatches. teamId=${job.request.teamId} fetchedMatches=${fetchedTeamMatches.matches.length}`,
          );
          throw new Error(
            `No se encontraron partidos para el equipo seleccionado (${job.request.teamId}).`,
          );
        }

        job.request.matchIds = matchIdsToProcess;
        await this.jobsStore.updateRequest(jobId, job.request);
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
          const wonValue = matchMeta?.won ?? won;
          if (job.request.wonOnly && wonValue !== true) {
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
            won: wonValue,
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
          'No se pudieron procesar posesiones validas para este equipo con los partidos actuales.',
        );
      }

      this.resultCache.set(cacheKey, {
        expiresAt: Date.now() + this.cacheTtlMs,
        value: result,
      });

      await this.completeJob(jobId, result, 'Analysis completed');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown processing error';
      console.error(
        `[analysis] Job ${jobId} failed. teamId=${job.request.teamId}. Reason: ${message}`,
      );
      await this.failJob(jobId, message);
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

  private ensureEventStream(jobId: string): Subject<JobEvent> {
    const current = this.events.get(jobId);
    if (current) {
      return current;
    }

    const stream = new Subject<JobEvent>();
    this.events.set(jobId, stream);
    return stream;
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    message?: string,
  ): Promise<void> {
    const job = await this.jobsStore.updateStatus(jobId, status);
    this.emitStatus(jobId, status, message, job.updatedAt.toISOString());
  }

  private async completeJob(
    jobId: string,
    result: AnalysisResult,
    message?: string,
  ): Promise<void> {
    const job = await this.jobsStore.completeJob(jobId, result);
    this.emitStatus(jobId, 'completed', message, job.updatedAt.toISOString());
    this.emitResult(jobId, result, job.updatedAt.toISOString());
    this.closeEvents(jobId);
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    const job = await this.jobsStore.failJob(jobId, errorMessage);

    const stream = this.ensureEventStream(jobId);
    stream.next({
      type: 'error',
      jobId,
      status: 'failed',
      updatedAt: job.updatedAt.toISOString(),
      message: errorMessage,
    });
    this.closeEvents(jobId);
  }

  private emitStatus(
    jobId: string,
    status: JobStatus,
    message?: string,
    updatedAt?: string,
  ): void {
    const stream = this.events.get(jobId);
    if (!stream) {
      return;
    }

    stream.next({
      type: 'status',
      jobId,
      status,
      updatedAt: updatedAt || new Date().toISOString(),
      message,
    });
  }

  private emitResult(
    jobId: string,
    result: AnalysisResult,
    updatedAt?: string,
  ): void {
    const stream = this.events.get(jobId);
    if (!stream) {
      return;
    }

    stream.next({
      type: 'result',
      jobId,
      status: 'completed',
      updatedAt: updatedAt || new Date().toISOString(),
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
