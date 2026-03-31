import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AnalysisService, type AnalysisJob, type AnalysisRequest, type AnalysisResult } from './analysis.service';
export declare class AnalysisController {
    private readonly analysisService;
    constructor(analysisService: AnalysisService);
    createJob(request: AnalysisRequest): AnalysisJob;
    getJob(jobId: string): AnalysisJob;
    getJobResult(jobId: string): AnalysisResult;
    streamJobEvents(jobId: string): Observable<MessageEvent>;
}
