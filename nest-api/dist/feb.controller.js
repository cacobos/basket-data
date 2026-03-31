"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FebController = void 0;
const common_1 = require("@nestjs/common");
const feb_service_1 = require("./feb.service");
let FebController = class FebController {
    febService;
    constructor(febService) {
        this.febService = febService;
    }
    async proxyImage(rawUrl, res) {
        if (!rawUrl) {
            throw new common_1.BadRequestException('url es obligatorio');
        }
        let parsed;
        try {
            parsed = new URL(rawUrl);
        }
        catch {
            throw new common_1.BadRequestException('url no válida');
        }
        if (!parsed.hostname.endsWith('feb.es')) {
            throw new common_1.BadRequestException('solo se permiten imágenes de feb.es');
        }
        const response = await fetch(parsed.toString());
        if (!response.ok) {
            throw new common_1.BadRequestException(`no se pudo obtener la imagen (${response.status})`);
        }
        const contentType = response.headers.get('content-type') ?? 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    }
    async getLeagues() {
        return this.febService.getLeagues();
    }
    async getLeagueTeams(leagueId, seasonId = '2025', slug = '', groupId) {
        return this.febService.getLeagueTeams(leagueId, seasonId, slug, groupId);
    }
    async getTeamPlayers(teamId) {
        return this.febService.getTeamPlayers(teamId);
    }
    async getActionPlayers(teamId, matchIds = '') {
        const parsedMatchIds = matchIds
            .split(',')
            .map((value) => value.trim())
            .filter((value) => /^\d+$/.test(value));
        return this.febService.getActionPlayers(teamId, parsedMatchIds);
    }
    async getTeamMatches(teamId) {
        return this.febService.getTeamMatches(teamId);
    }
    async getPlayerById(playerId, teamId) {
        return this.febService.getPlayerById(playerId, teamId);
    }
};
exports.FebController = FebController;
__decorate([
    (0, common_1.Get)('image'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "proxyImage", null);
__decorate([
    (0, common_1.Get)('leagues'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getLeagues", null);
__decorate([
    (0, common_1.Get)('leagues/:leagueId/teams'),
    __param(0, (0, common_1.Param)('leagueId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('seasonId')),
    __param(2, (0, common_1.Query)('slug')),
    __param(3, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, String]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getLeagueTeams", null);
__decorate([
    (0, common_1.Get)('teams/:teamId/players'),
    __param(0, (0, common_1.Param)('teamId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getTeamPlayers", null);
__decorate([
    (0, common_1.Get)('teams/:teamId/action-players'),
    __param(0, (0, common_1.Param)('teamId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('matchIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getActionPlayers", null);
__decorate([
    (0, common_1.Get)('teams/:teamId/matches'),
    __param(0, (0, common_1.Param)('teamId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getTeamMatches", null);
__decorate([
    (0, common_1.Get)('players/:playerId'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('teamId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], FebController.prototype, "getPlayerById", null);
exports.FebController = FebController = __decorate([
    (0, common_1.Controller)('feb'),
    __metadata("design:paramtypes", [feb_service_1.FebService])
], FebController);
//# sourceMappingURL=feb.controller.js.map