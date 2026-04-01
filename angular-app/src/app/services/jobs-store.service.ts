import { Injectable, signal } from '@angular/core';
import {
  AnalysisApiService,
  AnalysisJob,
  AnalysisResult,
  JobLauncher,
} from '../analysis-api.service';
import { AuthService } from './auth.service';

export interface JobState {
  jobId: string;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  selectedLeague?: string;
  selectedLeagueName?: string;
  selectedTeam?: string;
  selectedTeamId?: string;
  selectedTeamName?: string;
  selectedMatches: string[];
  selectedPlayers: string[];
  matchIds: string[];
  lineupMode: 'any' | 'all';
  won_only: boolean;
  opponent_team_id?: string;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
  launchedBy?: JobLauncher | null;
}

@Injectable({
  providedIn: 'root',
})
export class JobsStoreService {
  readonly jobs = signal<JobState[]>([]);
  readonly currentJob = signal<JobState | null>(null);
  private readonly eventSources = new Map<string, EventSource>();
  private readonly checkingJobStatus = new Set<string>();

  constructor(
    private readonly api: AnalysisApiService,
    private readonly auth: AuthService,
  ) {
    this.refreshSharedJobs();
  }

  refreshSharedJobs(): void {
    this.api.listJobs().subscribe({
      next: (jobs) => {
        const mapped = jobs.map((job) => this.mapServerJob(job));
        this.jobs.set(mapped);
        for (const job of mapped) {
          if (job.status === 'queued' || job.status === 'processing') {
            this.trackJob(job.jobId);
          }
        }
      },
      error: () => {
        this.jobs.set([]);
      },
    });
  }

  private mapServerJob(job: AnalysisJob): JobState {
    return {
      jobId: job.id,
      status: job.status,
      selectedTeamId: job.request?.teamId,
      selectedTeamName: job.request?.teamId,
      selectedMatches: [],
      selectedPlayers: job.request?.playerIds ?? [],
      matchIds: (job.request?.matchIds ?? []).map(String),
      lineupMode: job.request?.lineupMode === 'all' ? 'all' : 'any',
      won_only: Boolean(job.request?.wonOnly),
      opponent_team_id: job.request?.opponentTeamId,
      result: job.result,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      errorMessage: job.error,
      launchedBy: job.launchedBy ?? null,
    };
  }

  addJob(job: JobState): void {
    const current = this.jobs();
    this.jobs.set([job, ...current]);
  }

  updateJob(jobId: string, update: Partial<JobState>): void {
    const current = this.jobs();
    this.jobs.set(
      current.map((j) => (j.jobId === jobId ? { ...j, ...update, updatedAt: new Date() } : j)),
    );
  }

  trackJob(jobId: string): void {
    if (this.eventSources.has(jobId)) {
      return;
    }

    void this.openEventSource(jobId);
  }

  private async openEventSource(jobId: string): Promise<void> {
    const token = await this.auth.getIdToken();
    const source = new EventSource(this.api.getJobEventsUrl(jobId, token || undefined));
    this.eventSources.set(jobId, source);

    source.addEventListener('status', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        status?: JobState['status'];
        message?: string;
      };
      if (payload.status) {
        this.updateJob(jobId, {
          status: payload.status,
          errorMessage: payload.status === 'failed' ? payload.message : undefined,
        });
      }
    });

    source.addEventListener('result', () => {
      this.getJobResult(jobId).finally(() => this.stopTracking(jobId));
    });

    source.addEventListener('error', () => {
      const localJob = this.getJob(jobId);
      if (!localJob || localJob.status === 'completed' || localJob.status === 'failed') {
        this.stopTracking(jobId);
        return;
      }

      if (this.checkingJobStatus.has(jobId)) {
        return;
      }

      this.checkingJobStatus.add(jobId);
      this.api.getJob(jobId).subscribe({
        next: (job) => {
          if (job.status === 'completed') {
            this.getJobResult(jobId).finally(() => {
              this.stopTracking(jobId);
              this.checkingJobStatus.delete(jobId);
            });
            return;
          }

          if (job.status === 'failed') {
            this.updateJob(jobId, {
              status: 'failed',
              errorMessage: job.error || 'El job ha fallado',
            });
            this.stopTracking(jobId);
          } else {
            this.updateJob(jobId, {
              status: job.status,
            });
          }

          this.checkingJobStatus.delete(jobId);
        },
        error: () => {
          // No marcar como failed ante un corte puntual de SSE.
          this.checkingJobStatus.delete(jobId);
        },
      });
    });
  }

  stopTracking(jobId: string): void {
    const source = this.eventSources.get(jobId);
    if (!source) {
      return;
    }
    source.close();
    this.eventSources.delete(jobId);
  }

  getJob(jobId: string): JobState | undefined {
    return this.jobs().find((j) => j.jobId === jobId);
  }

  getJobResult(jobId: string): Promise<AnalysisResult | null> {
    return new Promise((resolve, reject) => {
      this.api.getAnalysisResult(jobId).subscribe({
        next: (result) => {
          this.updateJob(jobId, { result: result as AnalysisResult, status: 'completed' });
          resolve(result);
        },
        error: (error) => {
          this.updateJob(jobId, { status: 'failed', errorMessage: String(error as any) });
          reject(error);
        },
      });
    });
  }

  deleteJob(jobId: string): void {
    // Shared jobs viven en backend; se recarga para mantener consistencia global.
    this.stopTracking(jobId);
    this.refreshSharedJobs();
  }

  clearAll(): void {
    for (const job of this.jobs()) {
      this.stopTracking(job.jobId);
    }
    this.refreshSharedJobs();
  }
}
