import { Injectable, NotFoundException } from '@nestjs/common';
import { load } from 'cheerio';
import { existsSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

const FEB_BASE_URL = 'https://baloncestoenvivo.feb.es';
const FEB_IMAGE_BASE_URL = 'https://imagenes.feb.es';

export interface FebLeague {
  leagueId: string;
  seasonId: string;
  slug: string;
  statsUrl: string;
}

export interface FebLeagueGroup {
  groupId: string;
  name: string;
  selected: boolean;
}

export interface FebLeagueTeam {
  teamId: string;
  name: string;
  teamUrl: string;
}

export interface FebLeagueTeamsResult {
  leagueId: string;
  seasonId: string;
  slug: string;
  selectedGroupId: string;
  groups: FebLeagueGroup[];
  teams: FebLeagueTeam[];
}

export interface FebTeamPlayer {
  playerId: string;
  teamId: string;
  name: string;
  profileUrl: string;
  photoUrl: string;
}

export interface FebTeamPlayersResult {
  teamId: string;
  teamName: string;
  players: FebTeamPlayer[];
}

export interface FebActionPlayer extends FebTeamPlayer {
  appearances: number;
}

export interface FebActionPlayersResult {
  teamId: string;
  matchIds: string[];
  players: FebActionPlayer[];
}

export interface FebTeamMatch {
  matchId: string;
  ownTeamId: string;
  opponentTeamId: string | null;
  isHome: boolean | null;
  won: boolean | null;
  scoreFor: number | null;
  scoreAgainst: number | null;
}

export interface FebTeamMatchesResult {
  teamId: string;
  matches: FebTeamMatch[];
}

export interface FebPlayerProfile {
  playerId: string;
  teamId: string;
  name: string;
  photoUrl: string;
  profileUrl: string;
  attributes: Record<string, string>;
}

export interface FebLiveMatch {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  quarter: number | null;
  clock: string | null;
  score: string | null;
  lastAction: string | null;
  source: 'league-scan';
}

interface ScrapUtilsModule {
  getFebLeagues: () => Promise<FebLeague[]>;
  getFebLeagueTeams: (
    leagueId: string | number,
    seasonId: string | number,
    slug: string,
    groupId?: string | number,
  ) => Promise<FebLeagueTeamsResult>;
  getFebPlayByPlay: (matchId: string | number) => Promise<{
    rawPlayByPlay: {
      LINES?: Array<{
        idTeam?: string | null;
        idPlayer?: string | null;
        action?: string | null;
        text?: string | null;
        time?: string | null;
        quarter?: string | number | null;
        team?: string | null;
        scoreA?: string | null;
        scoreB?: string | null;
      }>;
    } | null;
  }>;
  getTeamPossessionReport: (
    matchId: string | number,
    ownTeamId: string | number,
  ) => Promise<{
    matchId: string;
    ownTeamId: string;
    opponentTeamId: string;
    ownOffense: unknown[];
    opponentOffense: unknown[];
    all: unknown[];
  }>;
}

@Injectable()
export class FebService {
  private cachedModule: ScrapUtilsModule | null = null;

  private extractMatchIdFromHref(href: string): string | null {
    const normalizedHref = href.replace(/&amp;/gi, '&');
    const partidoAspxMatch = normalizedHref.match(
      /Partido\.aspx\?(?:p|i)=(\d+)/i,
    );
    if (partidoAspxMatch?.[1]) {
      return partidoAspxMatch[1];
    }

    const prettyMatch = normalizedHref.match(/\/partido\/(\d+)/i);
    if (prettyMatch?.[1]) {
      return prettyMatch[1];
    }

    return null;
  }

  private normalizeFebUrl(rawHref: string): string {
    const cleaned = rawHref.replace(/&amp;/gi, '&').trim();
    if (!cleaned) {
      return '';
    }

    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      return cleaned;
    }

    return `${FEB_BASE_URL}/${cleaned.replace(/^\/+/, '')}`;
  }

  private extractMatchIdsFromHtml(html: string): string[] {
    const $ = load(html);
    const ids = new Set<string>();

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href') ?? '';
      const matchId = this.extractMatchIdFromHref(href);
      if (matchId) {
        ids.add(matchId);
      }
    });

    return Array.from(ids);
  }

  private extractCalendarUrlsFromHtml(html: string): string[] {
    const $ = load(html);
    const urls = new Set<string>();

    $('a[href*="calendario"]').each((_, element) => {
      const href = $(element).attr('href') ?? '';
      if (!href) {
        return;
      }
      urls.add(this.normalizeFebUrl(href));
    });

    const regex =
      /calendario\.aspx\?g=\d+&(?:amp;)?t=\d+&(?:amp;)?nm=[a-z0-9]+/gi;
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

  private async extractMatchIdsFromCalendars(
    calendarUrls: string[],
    teamId?: string,
  ): Promise<string[]> {
    const ids = new Set<string>();
    const normalizedTeamId = (teamId ?? '').trim();

    for (const calendarUrl of calendarUrls) {
      try {
        const response = await fetch(calendarUrl);
        if (!response.ok) {
          console.warn(
            `[extractMatchIdsFromCalendars] Failed to fetch ${calendarUrl} (status ${response.status})`,
          );
          continue;
        }

        const html = await response.text();
        if (!normalizedTeamId) {
          for (const matchId of this.extractMatchIdsFromHtml(html)) {
            ids.add(matchId);
          }
          continue;
        }

        console.log(
          `[extractMatchIdsFromCalendars] Filtering calendar for team ${normalizedTeamId}...`,
        );
        const $ = load(html);
        let foundByTeamFilter = 0;

        $('a[href]').each((_, element) => {
          const href = $(element).attr('href') ?? '';
          const matchId = this.extractMatchIdFromHref(href);
          if (!matchId) {
            return;
          }

          const container = $(element).closest('tr, li, article, section, div');
          const includesTeam =
            container.find(`a[href*="Equipo.aspx?i=${normalizedTeamId}"]`)
              .length > 0 ||
            container.find(`a[href*="/equipo/${normalizedTeamId}"]`).length > 0;

          if (includesTeam) {
            foundByTeamFilter++;
            ids.add(matchId);
          }
        });

        console.log(
          `[extractMatchIdsFromCalendars] Found ${foundByTeamFilter} matches for team ${normalizedTeamId} (total extracted: ${ids.size})`,
        );
        // NOTE: No fallback to all matches. This prevents extracting 180+ matches from other teams.
        // Play-by-play validation in getTeamMatches() will be the final filter.
      } catch (error) {
        console.error(
          `[extractMatchIdsFromCalendars] Error processing calendar ${calendarUrl}:`,
          error,
        );
      }
    }

    return Array.from(ids);
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
        'No se encontró scrap-utils/dist/index.js. Ejecuta build de scrap-utils o revisa el despliegue.',
      );
    }

    const moduleUrl = pathToFileURL(modulePath).href;
    const imported = (await import(moduleUrl)) as unknown as ScrapUtilsModule;
    this.cachedModule = imported;
    return imported;
  }

  async getLeagues(): Promise<FebLeague[]> {
    const scrapUtils = await this.loadScrapUtilsModule();
    return scrapUtils.getFebLeagues();
  }

  async getLeagueTeams(
    leagueId: string | number,
    seasonId: string | number,
    slug: string,
    groupId?: string,
  ): Promise<FebLeagueTeamsResult> {
    const scrapUtils = await this.loadScrapUtilsModule();
    return scrapUtils.getFebLeagueTeams(leagueId, seasonId, slug, groupId);
  }

  async getTeamPlayers(teamId: string | number): Promise<FebTeamPlayersResult> {
    const normalizedTeamId = String(teamId).trim();
    const teamUrl = `${FEB_BASE_URL}/equipo/${normalizedTeamId}`;
    const response = await fetch(teamUrl);
    if (!response.ok) {
      throw new NotFoundException(
        `No se pudo cargar el equipo ${normalizedTeamId}`,
      );
    }

    const html = await response.text();
    const $ = load(html);

    const teamName =
      $('h1.titulo-modulo').first().text().trim() ||
      $('h1').first().text().trim() ||
      `Team ${normalizedTeamId}`;

    const playersMap = new Map<string, FebTeamPlayer>();

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

    const players = Array.from(playersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      teamId: normalizedTeamId,
      teamName,
      players,
    };
  }

  async getActionPlayers(
    teamId: string | number,
    matchIds: Array<string | number>,
  ): Promise<FebActionPlayersResult> {
    const normalizedTeamId = String(teamId).trim();
    const normalizedMatchIds = Array.from(
      new Set(
        matchIds
          .map((id) => String(id).trim())
          .filter((id) => /^\d+$/.test(id)),
      ),
    );

    if (normalizedMatchIds.length === 0) {
      return {
        teamId: normalizedTeamId,
        matchIds: [],
        players: [],
      };
    }

    const scrapUtils = await this.loadScrapUtilsModule();
    const roster = await this.getTeamPlayers(normalizedTeamId);
    const rosterById = new Map<string, FebTeamPlayer>(
      roster.players.map((player) => [player.playerId, player]),
    );
    const appearances = new Map<string, number>();

    for (const matchId of normalizedMatchIds) {
      // Skip mock/fixture match IDs (used for UI testing)
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

    // If no action data was found, return empty array.
    let players: FebActionPlayer[];

    if (appearances.size === 0) {
      console.log(
        `[getActionPlayers] No action data found in play-by-play for team ${normalizedTeamId}. Returning empty array.`,
      );
      players = [];
    } else {
      players = Array.from(appearances.entries()).map(([playerId, count]) => {
        const fromRoster = rosterById.get(playerId);
        return {
          playerId,
          teamId: normalizedTeamId,
          name: fromRoster?.name ?? `Jugador ${playerId}`,
          profileUrl:
            fromRoster?.profileUrl ??
            `${FEB_BASE_URL}/Jugador.aspx?i=${normalizedTeamId}&c=${playerId}`,
          photoUrl:
            fromRoster?.photoUrl ??
            `${FEB_IMAGE_BASE_URL}/Foto.aspx?c=${playerId}`,
          appearances: count,
        };
      });
    }

    return {
      teamId: normalizedTeamId,
      matchIds: normalizedMatchIds,
      players: players.sort(
        (a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name),
      ),
    };
  }

  async getTeamMatches(teamId: string | number): Promise<FebTeamMatchesResult> {
    const normalizedTeamId = String(teamId).trim();
    const teamUrl = `${FEB_BASE_URL}/equipo/${normalizedTeamId}`;
    const legacyTeamUrl = `${FEB_BASE_URL}/Equipo.aspx?i=${normalizedTeamId}`;

    console.log(
      `[getTeamMatches] Fetching matches for team: ${normalizedTeamId}, URL: ${teamUrl}`,
    );

    let response = await fetch(teamUrl);
    if (!response.ok) {
      response = await fetch(legacyTeamUrl);
    }

    if (!response.ok) {
      console.error(
        `[getTeamMatches] Failed to fetch team page: ${response.status}`,
      );
      throw new NotFoundException(
        `No se pudo cargar los partidos del equipo ${normalizedTeamId}`,
      );
    }

    const html = await response.text();
    let matchIds = this.extractMatchIdsFromHtml(html);

    if (matchIds.length === 0) {
      const leagues = await this.getLeagues();
      for (const league of leagues) {
        try {
          const teamsResult = await this.getLeagueTeams(
            league.leagueId,
            league.seasonId,
            league.slug,
          );
          const belongsToLeague = teamsResult.teams.some(
            (team) => team.teamId === normalizedTeamId,
          );
          if (!belongsToLeague) {
            continue;
          }

          const calendarUrl = `${FEB_BASE_URL}/calendario.aspx?g=${league.leagueId}&t=${league.seasonId}&nm=${league.slug}`;
          console.log(
            `[getTeamMatches] Team ${normalizedTeamId} found in league ${league.slug}. Calling extractMatchIdsFromCalendars()...`,
          );
          const leagueMatchIds = await this.extractMatchIdsFromCalendars(
            [calendarUrl],
            normalizedTeamId,
          );
          console.log(
            `[getTeamMatches] extractMatchIdsFromCalendars returned ${leagueMatchIds.length} IDs for team ${normalizedTeamId}.`,
          );
          for (const matchId of leagueMatchIds) {
            matchIds.push(matchId);
          }
          break;
        } catch (error) {
          console.error(
            `[getTeamMatches] Error querying league ${league.slug}:`,
            error,
          );
        }
      }
    }

    matchIds = Array.from(new Set(matchIds));
    console.log(
      `[getTeamMatches] Candidate match IDs for team ${normalizedTeamId}: ${matchIds.length}`,
    );
    console.log(
      `[getTeamMatches] Starting play-by-play validation for ${matchIds.length} matchIds...`,
    );

    const scrapUtils = await this.loadScrapUtilsModule();
    const matches: FebTeamMatch[] = [];

    for (const matchId of matchIds) {
      try {
        const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
        const lines = playByPlay.rawPlayByPlay?.LINES;

        // Skip matches without valid play-by-play data
        if (!Array.isArray(lines) || lines.length === 0) {
          console.log(
            `[getTeamMatches] No play-by-play data for match ${matchId}. Skipping.`,
          );
          continue;
        }

        let team1Id: string | null = null;
        let team2Id: string | null = null;
        let finalA: number | null = null;
        let finalB: number | null = null;

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

        // Validate both teams extracted
        if (!team1Id || !team2Id) {
          console.log(
            `[getTeamMatches] Match ${matchId}: missing team IDs. Skipping.`,
          );
          continue;
        }

        // Validate team participates
        if (team1Id !== normalizedTeamId && team2Id !== normalizedTeamId) {
          console.log(
            `[getTeamMatches] Match ${matchId}: team ${normalizedTeamId} not in (${team1Id} vs ${team2Id}). Skipping.`,
          );
          continue;
        }

        const isHome = team1Id === normalizedTeamId;
        const opponentTeamId = team1Id === normalizedTeamId ? team2Id : team1Id;

        let scoreFor: number | null = null;
        let scoreAgainst: number | null = null;
        let won: boolean | null = null;

        if (finalA != null && finalB != null) {
          if (team1Id === normalizedTeamId) {
            scoreFor = finalA;
            scoreAgainst = finalB;
          } else {
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
      } catch (error) {
        console.error(
          `[getTeamMatches] Exception processing match ${matchId}:`,
          error,
        );
        continue;
      }
    }

    if (matches.length === 0) {
      if (matchIds.length > 0) {
        console.log(
          `[getTeamMatches] No valid matches after strict validation for team ${normalizedTeamId}. Returning ${matchIds.length} fallback IDs.`,
        );
        return {
          teamId: normalizedTeamId,
          matches: matchIds
            .map((matchId) => ({
              matchId,
              ownTeamId: normalizedTeamId,
              opponentTeamId: null,
              isHome: null,
              won: null,
              scoreFor: null,
              scoreAgainst: null,
            }))
            .sort((a, b) => Number(b.matchId) - Number(a.matchId)),
        };
      }

      console.log(
        `[getTeamMatches] No valid matches found for team ${normalizedTeamId}. Returning empty list.`,
      );
      return {
        teamId: normalizedTeamId,
        matches: [],
      };
    }

    console.log(
      `[getTeamMatches] Completed. Found ${matches.length} valid matches for team ${normalizedTeamId}.`,
    );

    return {
      teamId: normalizedTeamId,
      matches: matches.sort((a, b) => Number(b.matchId) - Number(a.matchId)),
    };
  }

  async getPlayerById(
    playerId: string | number,
    teamId?: string,
  ): Promise<FebPlayerProfile> {
    const normalizedPlayerId = String(playerId).trim();
    const normalizedTeamId = (teamId ?? '').trim();

    if (!normalizedTeamId) {
      throw new NotFoundException(
        'Para consultar jugador por id sin navegador, envía también teamId.',
      );
    }

    const profileUrl = `${FEB_BASE_URL}/Jugador.aspx?i=${normalizedTeamId}&c=${normalizedPlayerId}`;
    const response = await fetch(profileUrl);
    if (!response.ok) {
      throw new NotFoundException(
        `No se pudo cargar la ficha del jugador ${normalizedPlayerId}`,
      );
    }

    const html = await response.text();
    const $ = load(html);

    const nameFromCard = $('div.nombre').first().text().trim();
    const nameFromPageHeading =
      $('h1.titulo-modulo').first().text().trim() ||
      $('h1').first().text().trim();
    const name =
      nameFromCard ||
      (nameFromPageHeading &&
      !/trayectoria|estad[íi]sticas/i.test(nameFromPageHeading)
        ? nameFromPageHeading
        : '') ||
      `Player ${normalizedPlayerId}`;

    const attributes: Record<string, string> = {};

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

  async getLiveMatches(): Promise<FebLiveMatch[]> {
    const leagues = await this.getLeagues();
    const candidateMatchIds = new Set<string>();

    // Scan acotado para no saturar la API de FEB.
    for (const league of leagues.slice(0, 3)) {
      try {
        const teamsResult = await this.getLeagueTeams(
          league.leagueId,
          league.seasonId,
          league.slug,
        );
        for (const team of (teamsResult.teams ?? []).slice(0, 4)) {
          const teamMatches = await this.getTeamMatches(team.teamId);
          for (const match of (teamMatches.matches ?? []).slice(0, 3)) {
            candidateMatchIds.add(match.matchId);
            if (candidateMatchIds.size >= 40) {
              break;
            }
          }
          if (candidateMatchIds.size >= 40) {
            break;
          }
        }
      } catch {
        continue;
      }

      if (candidateMatchIds.size >= 40) {
        break;
      }
    }

    const scrapUtils = await this.loadScrapUtilsModule();
    const liveMatches: FebLiveMatch[] = [];

    for (const matchId of candidateMatchIds) {
      try {
        const playByPlay = await scrapUtils.getFebPlayByPlay(matchId);
        const lines = playByPlay.rawPlayByPlay?.LINES;
        if (!Array.isArray(lines) || lines.length === 0) {
          continue;
        }

        const latest = lines[lines.length - 1];
        const quarter = latest?.quarter != null ? Number(latest.quarter) : null;
        const clock = latest?.time ? String(latest.time).trim() : null;
        const score =
          latest?.scoreA != null && latest?.scoreB != null
            ? `${latest.scoreA}-${latest.scoreB}`
            : null;
        const lastAction = latest?.text ? String(latest.text).trim() : null;

        let homeTeamId: string | null = null;
        let awayTeamId: string | null = null;
        for (const line of lines) {
          const slot = line?.team ? String(line.team).trim() : '';
          const id = line?.idTeam ? String(line.idTeam).trim() : '';
          if (slot === '1' && id) {
            homeTeamId = id;
          }
          if (slot === '2' && id) {
            awayTeamId = id;
          }
        }

        const maybeLive =
          quarter != null &&
          quarter >= 1 &&
          clock != null &&
          clock !== '' &&
          clock !== '00:00';

        if (!maybeLive) {
          continue;
        }

        liveMatches.push({
          matchId,
          homeTeamId,
          awayTeamId,
          quarter,
          clock,
          score,
          lastAction,
          source: 'league-scan',
        });
      } catch {
        continue;
      }
    }

    return liveMatches.sort((a, b) => Number(b.matchId) - Number(a.matchId));
  }

  async getLiveMatchPossessions(
    matchId: string,
    teamId: string,
  ): Promise<{
    matchId: string;
    teamId: string;
    ownOffense: number;
    opponentOffense: number;
    total: number;
  }> {
    const scrapUtils = await this.loadScrapUtilsModule();
    const report = await scrapUtils.getTeamPossessionReport(matchId, teamId);
    return {
      matchId: report.matchId,
      teamId,
      ownOffense: report.ownOffense.length,
      opponentOffense: report.opponentOffense.length,
      total: report.all.length,
    };
  }
}
