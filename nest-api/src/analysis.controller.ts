import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import {
  AnalysisService,
  type AnalysisJob,
  type AnalysisRequest,
  type AnalysisResult,
} from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('jobs')
  createJob(@Body() request: AnalysisRequest): AnalysisJob {
    return this.analysisService.createJob(request);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string): AnalysisJob {
    return this.analysisService.getJob(jobId);
  }

  @Get('jobs/:jobId/result')
  getJobResult(@Param('jobId') jobId: string): AnalysisResult {
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
}
