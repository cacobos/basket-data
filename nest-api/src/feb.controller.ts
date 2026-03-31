import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  FebActionPlayersResult,
  FebLeague,
  FebLeagueTeamsResult,
  FebPlayerProfile,
  FebService,
  FebTeamMatchesResult,
  FebTeamPlayersResult,
} from './feb.service';

@Controller('feb')
export class FebController {
  constructor(private readonly febService: FebService) {}

  @Get('image')
  async proxyImage(
    @Query('url') rawUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!rawUrl) {
      throw new BadRequestException('url es obligatorio');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('url no válida');
    }

    if (!parsed.hostname.endsWith('feb.es')) {
      throw new BadRequestException('solo se permiten imágenes de feb.es');
    }

    const response = await fetch(parsed.toString());
    if (!response.ok) {
      throw new BadRequestException(
        `no se pudo obtener la imagen (${response.status})`,
      );
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @Get('leagues')
  async getLeagues(): Promise<FebLeague[]> {
    return this.febService.getLeagues();
  }

  @Get('leagues/:leagueId/teams')
  async getLeagueTeams(
    @Param('leagueId', ParseIntPipe) leagueId: number,
    @Query('seasonId') seasonId = '2025',
    @Query('slug') slug = '',
    @Query('groupId') groupId?: string,
  ): Promise<FebLeagueTeamsResult> {
    return this.febService.getLeagueTeams(leagueId, seasonId, slug, groupId);
  }

  @Get('teams/:teamId/players')
  async getTeamPlayers(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<FebTeamPlayersResult> {
    return this.febService.getTeamPlayers(teamId);
  }

  @Get('teams/:teamId/action-players')
  async getActionPlayers(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('matchIds') matchIds = '',
  ): Promise<FebActionPlayersResult> {
    const parsedMatchIds = matchIds
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d+$/.test(value));

    return this.febService.getActionPlayers(teamId, parsedMatchIds);
  }

  @Get('teams/:teamId/matches')
  async getTeamMatches(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<FebTeamMatchesResult> {
    return this.febService.getTeamMatches(teamId);
  }

  @Get('players/:playerId')
  async getPlayerById(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Query('teamId') teamId?: string,
  ): Promise<FebPlayerProfile> {
    return this.febService.getPlayerById(playerId, teamId);
  }
}
