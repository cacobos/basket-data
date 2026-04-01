"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const url_1 = require("url");
const feb_service_1 = require("./feb.service");
let AnalysisService = class AnalysisService {
    febService;
    cacheTtlMs = 5 * 60 * 1000;
    jobs = new Map();
    events = new Map();
    resultCache = new Map();
    cachedModule = null;
    constructor(febService) {
        this.febService = febService;
    }
    async loadScrapUtilsModule() {
        if (this.cachedModule) {
            return this.cachedModule;
        }
        const modulePath = path.resolve(process.cwd(), '..', 'scrap-utils', 'dist', 'index.js');
        const moduleUrl = (0, url_1.pathToFileURL)(modulePath).href;
        const imported = (await import(moduleUrl));
        this.cachedModule = imported;
        return imported;
    }
    createJob(request) {
        const normalized = this.normalizeRequest(request);
        const now = new Date().toISOString();
        const id = this.generateId();
        const job = {
            id,
            status: 'queued',
            createdAt: now,
            updatedAt: now,
            request: normalized,
        };
        this.jobs.set(id, job);
        this.events.set(id, new rxjs_1.Subject());
        this.emitStatus(id, 'queued', 'Job queued');
        void this.processJob(id);
        return job;
    }
    getJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        }
        return job;
    }
    getJobResult(jobId) {
        const job = this.getJob(jobId);
        if (job.status !== 'completed' || !job.result) {
            throw new common_1.NotFoundException(`Job ${jobId} has no completed result yet`);
        }
        return job.result;
    }
    getJobEvents(jobId) {
        const stream = this.events.get(jobId);
        if (!stream) {
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        }
        return stream.asObservable();
    }
    normalizeRequest(request) {
        const uniqueMatchIds = Array.from(new Set((request.matchIds ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)));
        const teamId = String(request.teamId ?? '').trim();
        if (!teamId) {
            throw new common_1.NotFoundException('teamId is required');
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
    ensureLineupHasFivePlayers(lineup) {
        if (!Array.isArray(lineup)) {
            lineup = [];
        }
        const uniquePlayers = Array.from(new Set(lineup.map((id) => String(id).trim()).filter(Boolean)));
        if (uniquePlayers.length >= 5) {
            return uniquePlayers.slice(0, 5);
        }
        const result = [...uniquePlayers];
        for (let i = result.length; i < 5; i++) {
            result.push(`UNKNOWN_${i + 1}`);
        }
        return result;
    }
    async processJob(jobId) {
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
            const matches = [];
            let matchIdsToProcess = job.request.matchIds ?? [];
            const teamMatches = await this.febService
                .getTeamMatches(job.request.teamId)
                .catch(() => null);
            const matchMetaById = new Map((teamMatches?.matches ?? []).map((item) => [
                String(item.matchId),
                { isHome: item.isHome, won: item.won },
            ]));
            if (matchIdsToProcess.length === 0) {
                const teamMatches = await this.febService.getTeamMatches(job.request.teamId);
                matchIdsToProcess = Array.from(new Set((teamMatches.matches ?? [])
                    .map((match) => Number(match.matchId))
                    .filter((id) => Number.isFinite(id) && id > 0)));
                if (matchIdsToProcess.length === 0) {
                    throw new Error('No se encontraron partidos para el equipo seleccionado.');
                }
                job.request.matchIds = matchIdsToProcess;
            }
            for (const matchId of matchIdsToProcess) {
                try {
                    const report = await scrapUtils.getTeamPossessionReport(matchId, job.request.teamId);
                    let possessions = report.all;
                    if (job.request.opponentTeamId) {
                        possessions = possessions.filter((item) => item.opponentTeamId === job.request.opponentTeamId);
                    }
                    if (job.request.playerIds && job.request.playerIds.length > 0) {
                        possessions = possessions.filter((item) => {
                            if (job.request.lineupMode === 'all') {
                                return job.request.playerIds.every((playerId) => item.ownLineup.includes(playerId));
                            }
                            return job.request.playerIds.some((playerId) => item.ownLineup.includes(playerId));
                        });
                    }
                    const won = await this.computeMatchWon(scrapUtils, String(matchId), job.request.teamId);
                    const matchMeta = matchMetaById.get(String(matchId));
                    if (job.request.wonOnly && won !== true) {
                        continue;
                    }
                    const ownOffensePossessions = possessions.filter((item) => item.side === 'own_offense');
                    const opponentOffensePossessions = possessions.filter((item) => item.side === 'opponent_offense');
                    const ownOffensePoints = ownOffensePossessions.reduce((acc, item) => acc + (item.points || 0), 0);
                    const opponentOffensePoints = opponentOffensePossessions.reduce((acc, item) => acc + (item.points || 0), 0);
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
                }
                catch {
                    continue;
                }
            }
            const quintetMap = new Map();
            for (const match of matches) {
                const combinedPossessions = [
                    ...match.ownOffensePossessions,
                    ...match.opponentOffensePossessions,
                ];
                for (const possession of combinedPossessions) {
                    const normalizedLineup = this.ensureLineupHasFivePlayers(possession.ownLineup || []).sort((a, b) => a.localeCompare(b));
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
            const quintets = Array.from(quintetMap.values())
                .map((item) => ({
                playerIds: item.playerIds,
                possessions: item.possessions,
                points: item.points,
                pointsPerPossession: item.possessions
                    ? item.points / item.possessions
                    : 0,
            }))
                .sort((a, b) => b.pointsPerPossession - a.pointsPerPossession ||
                b.possessions - a.possessions ||
                b.points - a.points);
            const totals = matches.reduce((acc, match) => {
                acc.possessions += match.total;
                acc.ownOffense += match.ownOffense;
                acc.opponentOffense += match.opponentOffense;
                acc.ownPoints += match.ownOffensePoints;
                acc.opponentPoints += match.opponentOffensePoints;
                return acc;
            }, {
                matches: matches.length,
                possessions: 0,
                ownOffense: 0,
                opponentOffense: 0,
                ownPoints: 0,
                opponentPoints: 0,
                ownPointsPerPossession: 0,
                opponentPointsPerPossession: 0,
            });
            totals.ownPointsPerPossession = totals.ownOffense
                ? totals.ownPoints / totals.ownOffense
                : 0;
            totals.opponentPointsPerPossession = totals.opponentOffense
                ? totals.opponentPoints / totals.opponentOffense
                : 0;
            const result = {
                generatedAt: new Date().toISOString(),
                request: job.request,
                totals,
                matches,
                quintets,
            };
            if (result.totals.matches === 0 || result.totals.possessions === 0) {
                throw new Error('No se pudieron procesar posesiones válidas para este equipo con los partidos actuales.');
            }
            this.resultCache.set(cacheKey, {
                expiresAt: Date.now() + this.cacheTtlMs,
                value: result,
            });
            this.completeJob(jobId, result, 'Analysis completed');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown processing error';
            this.failJob(jobId, message);
        }
    }
    async computeMatchWon(scrapUtils, matchId, ownTeamId) {
        const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
        const lines = playByPlay.rawPlayByPlay?.LINES;
        if (!Array.isArray(lines) || lines.length === 0) {
            return null;
        }
        let team1Id = null;
        let team2Id = null;
        let finalA = null;
        let finalB = null;
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
    updateJobStatus(jobId, status, message) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return;
        }
        job.status = status;
        job.updatedAt = new Date().toISOString();
        this.emitStatus(jobId, status, message);
    }
    completeJob(jobId, result, message) {
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
    failJob(jobId, errorMessage) {
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
    emitStatus(jobId, status, message) {
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
    emitResult(jobId, result) {
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
    closeEvents(jobId) {
        const stream = this.events.get(jobId);
        stream?.complete();
        this.events.delete(jobId);
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [feb_service_1.FebService])
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map