import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import {
  AnalysisService,
  type AnalysisJob,
  type AnalysisRequest,
  type AnalysisResult,
  type JobLauncher,
  type TeamSearchLock,
} from './analysis.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';

@Controller('analysis')
@UseGuards(FirebaseAuthGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('jobs')
  async listJobs(): Promise<AnalysisJob[]> {
    return this.analysisService.listJobs();
  }

  @Get('team-locks')
  async listTeamLocks(): Promise<TeamSearchLock[]> {
    return this.analysisService.listTeamLocks();
  }

  @Post('jobs')
  async createJob(
    @Body() request: AnalysisRequest,
    @Req() req: { user?: Record<string, unknown> },
  ): Promise<AnalysisJob> {
    return this.analysisService.createJob(request, this.mapLauncher(req.user));
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string): Promise<AnalysisJob> {
    return this.analysisService.getJob(jobId);
  }

  @Get('jobs/:jobId/result')
  async getJobResult(@Param('jobId') jobId: string): Promise<AnalysisResult> {
    return this.analysisService.getJobResult(jobId);
  }

  @Sse('jobs/:jobId/events')
  streamJobEvents(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.analysisService.getJobEvents(jobId).pipe(
      map((payload) => ({
        type: payload.type,
        data: payload,
      })),
    );
  }

  private mapLauncher(user?: Record<string, unknown>): JobLauncher | null {
    if (!user) {
      return null;
    }

    const displayNameValue =
      typeof user['name'] === 'string'
        ? user['name']
        : typeof user['displayName'] === 'string'
          ? user['displayName']
          : undefined;

    const launcher: JobLauncher = {};

    if (typeof user['user_id'] === 'string' && user['user_id'].trim()) {
      launcher.userId = user['user_id'].trim();
    }

    if (typeof user['email'] === 'string' && user['email'].trim()) {
      launcher.email = user['email'].trim();
    }

    if (displayNameValue?.trim()) {
      launcher.displayName = displayNameValue.trim();
    }

    const firebaseValue = user['firebase'];
    const providerValue =
      firebaseValue && typeof firebaseValue === 'object'
        ? (firebaseValue as { sign_in_provider?: unknown }).sign_in_provider
        : undefined;

    if (typeof providerValue === 'string' && providerValue.trim()) {
      launcher.provider = providerValue.trim();
    }

    return Object.keys(launcher).length > 0 ? launcher : null;
  }
}
