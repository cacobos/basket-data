import { Injectable, signal } from '@angular/core';
import { AnalysisApiService, AnalysisResult } from '../analysis-api.service';

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
}

@Injectable({
  providedIn: 'root',
})
export class JobsStoreService {
  private static readonly JOB_TTL_MS = 24 * 60 * 60 * 1000;

  readonly jobs = signal<JobState[]>([]);
  readonly currentJob = signal<JobState | null>(null);
  private readonly eventSources = new Map<string, EventSource>();
  private readonly checkingJobStatus = new Set<string>();

  constructor(private readonly api: AnalysisApiService) {
    this.loadJobs();
    this.pruneExpiredJobs();
  }

  private loadJobs(): void {
    // Cargar jobs del localStorage
    const stored = localStorage.getItem('jobs');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Array<
          Omit<JobState, 'createdAt' | 'updatedAt'> & {
            createdAt: string;
            updatedAt: string;
          }
        >;
        this.jobs.set(
          parsed.map((job) => ({
            ...job,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          })),
        );
      } catch {
        this.jobs.set([]);
      }
    }
  }

  private saveJobs(): void {
    this.pruneExpiredJobs();
    localStorage.setItem('jobs', JSON.stringify(this.jobs()));
  }

  private pruneExpiredJobs(): void {
    const now = Date.now();
    const filtered = this.jobs().filter(
      (job) => now - new Date(job.createdAt).getTime() < JobsStoreService.JOB_TTL_MS,
    );

    if (filtered.length !== this.jobs().length) {
      this.jobs.set(filtered);
    }
  }

  addJob(job: JobState): void {
    const current = this.jobs();
    this.jobs.set([job, ...current]);
    this.saveJobs();
  }

  updateJob(jobId: string, update: Partial<JobState>): void {
    const current = this.jobs();
    this.jobs.set(
      current.map((j) => (j.jobId === jobId ? { ...j, ...update, updatedAt: new Date() } : j)),
    );
    this.saveJobs();
  }

  trackJob(jobId: string): void {
    if (this.eventSources.has(jobId)) {
      return;
    }

    const source = new EventSource(this.api.getJobEventsUrl(jobId));
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
    this.stopTracking(jobId);
    this.jobs.set(this.jobs().filter((j) => j.jobId !== jobId));
    this.saveJobs();
  }

  clearAll(): void {
    for (const job of this.jobs()) {
      this.stopTracking(job.jobId);
    }
    this.jobs.set([]);
    this.saveJobs();
  }
}
