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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FebService = void 0;
const common_1 = require("@nestjs/common");
const cheerio_1 = require("cheerio");
const path = __importStar(require("path"));
const url_1 = require("url");
const FEB_BASE_URL = 'https://baloncestoenvivo.feb.es';
const FEB_IMAGE_BASE_URL = 'https://imagenes.feb.es';
let FebService = class FebService {
    cachedModule = null;
    extractMatchIdFromHref(href) {
        const normalizedHref = href.replace(/&amp;/gi, '&');
        const partidoAspxMatch = normalizedHref.match(/Partido\.aspx\?(?:p|i)=(\d+)/i);
        if (partidoAspxMatch?.[1]) {
            return partidoAspxMatch[1];
        }
        const prettyMatch = normalizedHref.match(/\/partido\/(\d+)/i);
        if (prettyMatch?.[1]) {
            return prettyMatch[1];
        }
        return null;
    }
    normalizeFebUrl(rawHref) {
        const cleaned = rawHref.replace(/&amp;/gi, '&').trim();
        if (!cleaned) {
            return '';
        }
        if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
            return cleaned;
        }
        return `${FEB_BASE_URL}/${cleaned.replace(/^\/+/, '')}`;
    }
    extractMatchIdsFromHtml(html) {
        const $ = (0, cheerio_1.load)(html);
        const ids = new Set();
        $('a[href]').each((_, element) => {
            const href = $(element).attr('href') ?? '';
            const matchId = this.extractMatchIdFromHref(href);
            if (matchId) {
                ids.add(matchId);
            }
        });
        return Array.from(ids);
    }
    extractCalendarUrlsFromHtml(html) {
        const $ = (0, cheerio_1.load)(html);
        const urls = new Set();
        $('a[href*="calendario"]').each((_, element) => {
            const href = $(element).attr('href') ?? '';
            if (!href) {
                return;
            }
            urls.add(this.normalizeFebUrl(href));
        });
        const regex = /calendario\.aspx\?g=\d+&(?:amp;)?t=\d+&(?:amp;)?nm=[a-z0-9]+/gi;
        let match = regex.exec(html);
        while (match) {
            const href = match[0] ?? '';
            if (href) {
                urls.add(this.normalizeFebUrl(href));
            }
            match = regex.exec(html);
        }
        return Array.from(urls).filter(Boolean);
    }
    async extractMatchIdsFromCalendars(calendarUrls, teamId) {
        const ids = new Set();
        const normalizedTeamId = (teamId ?? '').trim();
        for (const calendarUrl of calendarUrls) {
            try {
                const response = await fetch(calendarUrl);
                if (!response.ok) {
                    console.warn(`[extractMatchIdsFromCalendars] Failed to fetch ${calendarUrl} (status ${response.status})`);
                    continue;
                }
                const html = await response.text();
                if (!normalizedTeamId) {
                    for (const matchId of this.extractMatchIdsFromHtml(html)) {
                        ids.add(matchId);
                    }
                    continue;
                }
                console.log(`[extractMatchIdsFromCalendars] Filtering calendar for team ${normalizedTeamId}...`);
                const $ = (0, cheerio_1.load)(html);
                let foundByTeamFilter = 0;
                $('a[href]').each((_, element) => {
                    const href = $(element).attr('href') ?? '';
                    const matchId = this.extractMatchIdFromHref(href);
                    if (!matchId) {
                        return;
                    }
                    const container = $(element).closest('tr, li, article, section, div');
                    const includesTeam = container.find(`a[href*="Equipo.aspx?i=${normalizedTeamId}"]`)
                        .length > 0 ||
                        container.find(`a[href*="/equipo/${normalizedTeamId}"]`).length > 0;
                    if (includesTeam) {
                        foundByTeamFilter++;
                        ids.add(matchId);
                    }
                });
                console.log(`[extractMatchIdsFromCalendars] Found ${foundByTeamFilter} matches for team ${normalizedTeamId} (total extracted: ${ids.size})`);
            }
            catch (error) {
                console.error(`[extractMatchIdsFromCalendars] Error processing calendar ${calendarUrl}:`, error);
            }
        }
        return Array.from(ids);
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
    async getLeagues() {
        const scrapUtils = await this.loadScrapUtilsModule();
        return scrapUtils.getFebLeagues();
    }
    async getLeagueTeams(leagueId, seasonId, slug, groupId) {
        const scrapUtils = await this.loadScrapUtilsModule();
        return scrapUtils.getFebLeagueTeams(leagueId, seasonId, slug, groupId);
    }
    async getTeamPlayers(teamId) {
        const normalizedTeamId = String(teamId).trim();
        const teamUrl = `${FEB_BASE_URL}/equipo/${normalizedTeamId}`;
        const response = await fetch(teamUrl);
        if (!response.ok) {
            throw new common_1.NotFoundException(`No se pudo cargar el equipo ${normalizedTeamId}`);
        }
        const html = await response.text();
        const $ = (0, cheerio_1.load)(html);
        const teamName = $('h1.titulo-modulo').first().text().trim() ||
            $('h1').first().text().trim() ||
            `Team ${normalizedTeamId}`;
        const playersMap = new Map();
        $('a[href*="Jugador.aspx?i="]').each((_, element) => {
            const href = $(element).attr('href') ?? '';
            const idMatch = href.match(/[?&]c=(\d+)/i);
            if (!idMatch) {
                return;
            }
            const playerId = idMatch[1] ?? '';
            if (!playerId) {
                return;
            }
            const absoluteProfile = href.startsWith('http')
                ? href
                : `${FEB_BASE_URL}/${href.replace(/^\/+/, '')}`;
            const name = $(element).text().trim();
            if (!name) {
                return;
            }
            if (!playersMap.has(playerId)) {
                playersMap.set(playerId, {
                    playerId,
                    teamId: normalizedTeamId,
                    name,
                    profileUrl: absoluteProfile,
                    photoUrl: `${FEB_IMAGE_BASE_URL}/Foto.aspx?c=${playerId}`,
                });
            }
        });
        const players = Array.from(playersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        return {
            teamId: normalizedTeamId,
            teamName,
            players,
        };
    }
    async getActionPlayers(teamId, matchIds) {
        const normalizedTeamId = String(teamId).trim();
        const normalizedMatchIds = Array.from(new Set(matchIds
            .map((id) => String(id).trim())
            .filter((id) => /^\d+$/.test(id))));
        if (normalizedMatchIds.length === 0) {
            return {
                teamId: normalizedTeamId,
                matchIds: [],
                players: [],
            };
        }
        const scrapUtils = await this.loadScrapUtilsModule();
        const roster = await this.getTeamPlayers(normalizedTeamId);
        const rosterById = new Map(roster.players.map((player) => [player.playerId, player]));
        const appearances = new Map();
        for (const matchId of normalizedMatchIds) {
            if (!/^\d{6,}$/.test(matchId)) {
                console.log(`[getActionPlayers] Skipping mock match ID: ${matchId}`);
                continue;
            }
            const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
            const lines = playByPlay.rawPlayByPlay?.LINES;
            if (!Array.isArray(lines)) {
                continue;
            }
            for (const line of lines) {
                const lineTeamId = line?.idTeam ? String(line.idTeam).trim() : '';
                const linePlayerId = line?.idPlayer ? String(line.idPlayer).trim() : '';
                if (!linePlayerId || lineTeamId !== normalizedTeamId) {
                    continue;
                }
                appearances.set(linePlayerId, (appearances.get(linePlayerId) ?? 0) + 1);
            }
        }
        let players;
        if (appearances.size === 0) {
            console.log(`[getActionPlayers] No action data found in play-by-play for team ${normalizedTeamId}. Returning empty array.`);
            players = [];
        }
        else {
            players = Array.from(appearances.entries()).map(([playerId, count]) => {
                const fromRoster = rosterById.get(playerId);
                return {
                    playerId,
                    teamId: normalizedTeamId,
                    name: fromRoster?.name ?? `Jugador ${playerId}`,
                    profileUrl: fromRoster?.profileUrl ??
                        `${FEB_BASE_URL}/Jugador.aspx?i=${normalizedTeamId}&c=${playerId}`,
                    photoUrl: fromRoster?.photoUrl ??
                        `${FEB_IMAGE_BASE_URL}/Foto.aspx?c=${playerId}`,
                    appearances: count,
                };
            });
        }
        return {
            teamId: normalizedTeamId,
            matchIds: normalizedMatchIds,
            players: players.sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name)),
        };
    }
    async getTeamMatches(teamId) {
        const normalizedTeamId = String(teamId).trim();
        const teamUrl = `${FEB_BASE_URL}/equipo/${normalizedTeamId}`;
        const legacyTeamUrl = `${FEB_BASE_URL}/Equipo.aspx?i=${normalizedTeamId}`;
        console.log(`[getTeamMatches] Fetching matches for team: ${normalizedTeamId}, URL: ${teamUrl}`);
        let response = await fetch(teamUrl);
        if (!response.ok) {
            response = await fetch(legacyTeamUrl);
        }
        if (!response.ok) {
            console.error(`[getTeamMatches] Failed to fetch team page: ${response.status}`);
            throw new common_1.NotFoundException(`No se pudo cargar los partidos del equipo ${normalizedTeamId}`);
        }
        const html = await response.text();
        let matchIds = this.extractMatchIdsFromHtml(html);
        if (matchIds.length === 0) {
            const leagues = await this.getLeagues();
            for (const league of leagues) {
                try {
                    const teamsResult = await this.getLeagueTeams(league.leagueId, league.seasonId, league.slug);
                    const belongsToLeague = teamsResult.teams.some((team) => team.teamId === normalizedTeamId);
                    if (!belongsToLeague) {
                        continue;
                    }
                    const calendarUrl = `${FEB_BASE_URL}/calendario.aspx?g=${league.leagueId}&t=${league.seasonId}&nm=${league.slug}`;
                    console.log(`[getTeamMatches] Team ${normalizedTeamId} found in league ${league.slug}. Calling extractMatchIdsFromCalendars()...`);
                    const leagueMatchIds = await this.extractMatchIdsFromCalendars([calendarUrl], normalizedTeamId);
                    for (const matchId of leagueMatchIds) {
                        matchIds.push(matchId);
                    }
                    break;
                }
                catch (error) {
                    console.error(`[getTeamMatches] Error querying league ${league.slug}:`, error);
                }
            }
        }
        matchIds = Array.from(new Set(matchIds));
        console.log(`[getTeamMatches] Starting play-by-play validation for ${matchIds.length} matchIds...`);
        const scrapUtils = await this.loadScrapUtilsModule();
        const matches = [];
        for (const matchId of matchIds) {
            try {
                const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
                const lines = playByPlay.rawPlayByPlay?.LINES;
                if (!Array.isArray(lines) || lines.length === 0) {
                    console.log(`[getTeamMatches] No play-by-play data for match ${matchId}. Skipping.`);
                    continue;
                }
                let team1Id = null;
                let team2Id = null;
                let finalA = null;
                let finalB = null;
                for (const line of lines) {
                    const teamSlot = line?.team ? String(line.team).trim() : '';
                    const idTeam = line?.idTeam ? String(line.idTeam).trim() : '';
                    if (teamSlot === '1' && idTeam) {
                        team1Id = idTeam;
                    }
                    if (teamSlot === '2' && idTeam) {
                        team2Id = idTeam;
                    }
                    if (line?.scoreA != null && line.scoreA !== '') {
                        const value = Number(line.scoreA);
                        if (Number.isFinite(value)) {
                            finalA = value;
                        }
                    }
                    if (line?.scoreB != null && line.scoreB !== '') {
                        const value = Number(line.scoreB);
                        if (Number.isFinite(value)) {
                            finalB = value;
                        }
                    }
                }
                if (!team1Id || !team2Id) {
                    console.log(`[getTeamMatches] Match ${matchId}: missing team IDs. Skipping.`);
                    continue;
                }
                if (team1Id !== normalizedTeamId && team2Id !== normalizedTeamId) {
                    console.log(`[getTeamMatches] Match ${matchId}: team ${normalizedTeamId} not in (${team1Id} vs ${team2Id}). Skipping.`);
                    continue;
                }
                const isHome = team1Id === normalizedTeamId;
                const opponentTeamId = team1Id === normalizedTeamId ? team2Id : team1Id;
                let scoreFor = null;
                let scoreAgainst = null;
                let won = null;
                if (finalA != null && finalB != null) {
                    if (team1Id === normalizedTeamId) {
                        scoreFor = finalA;
                        scoreAgainst = finalB;
                    }
                    else {
                        scoreFor = finalB;
                        scoreAgainst = finalA;
                    }
                    if (scoreFor != null && scoreAgainst != null) {
                        won = scoreFor > scoreAgainst;
                    }
                }
                matches.push({
                    matchId,
                    ownTeamId: normalizedTeamId,
                    opponentTeamId,
                    isHome,
                    won,
                    scoreFor,
                    scoreAgainst,
                });
            }
            catch (error) {
                console.error(`[getTeamMatches] Exception processing match ${matchId}:`, error);
                continue;
            }
        }
        if (matches.length === 0) {
            console.log(`[getTeamMatches] No valid matches found for team ${normalizedTeamId}. Returning empty list.`);
            return {
                teamId: normalizedTeamId,
                matches: [],
            };
        }
        console.log(`[getTeamMatches] Completed. Found ${matches.length} valid matches for team ${normalizedTeamId}.`);
        return {
            teamId: normalizedTeamId,
            matches: matches.sort((a, b) => Number(b.matchId) - Number(a.matchId)),
        };
    }
    async getPlayerById(playerId, teamId) {
        const normalizedPlayerId = String(playerId).trim();
        const normalizedTeamId = (teamId ?? '').trim();
        if (!normalizedTeamId) {
            throw new common_1.NotFoundException('Para consultar jugador por id sin navegador, envía también teamId.');
        }
        const profileUrl = `${FEB_BASE_URL}/Jugador.aspx?i=${normalizedTeamId}&c=${normalizedPlayerId}`;
        const response = await fetch(profileUrl);
        if (!response.ok) {
            throw new common_1.NotFoundException(`No se pudo cargar la ficha del jugador ${normalizedPlayerId}`);
        }
        const html = await response.text();
        const $ = (0, cheerio_1.load)(html);
        const nameFromCard = $('div.nombre').first().text().trim();
        const nameFromPageHeading = $('h1.titulo-modulo').first().text().trim() ||
            $('h1').first().text().trim();
        const name = nameFromCard ||
            (nameFromPageHeading &&
                !/trayectoria|estad[íi]sticas/i.test(nameFromPageHeading)
                ? nameFromPageHeading
                : '') ||
            `Player ${normalizedPlayerId}`;
        const attributes = {};
        $('span.label, .label').each((_, labelElement) => {
            const label = $(labelElement).text().replace(/:\s*$/, '').trim();
            const value = $(labelElement).next().text().trim();
            if (label && value) {
                attributes[label] = value;
            }
        });
        $('tr').each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 2) {
                const key = $(cells[0]).text().replace(/:\s*$/, '').trim();
                const value = $(cells[1]).text().trim();
                if (key && value && !attributes[key]) {
                    attributes[key] = value;
                }
            }
        });
        return {
            playerId: normalizedPlayerId,
            teamId: normalizedTeamId,
            name,
            photoUrl: `${FEB_IMAGE_BASE_URL}/Foto.aspx?c=${normalizedPlayerId}`,
            profileUrl,
            attributes,
        };
    }
};
exports.FebService = FebService;
exports.FebService = FebService = __decorate([
    (0, common_1.Injectable)()
], FebService);
//# sourceMappingURL=feb.service.js.map