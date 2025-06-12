import { Controller, UseGuards, Post, Body, Req, Get, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles: string[];
  };
}

@UseGuards(AuthGuard('jwt'))
@Controller('players') // Base path /players
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  // Create a player for a specific team
  // POST /players/team/:teamId
  @Post('team/:teamId')
  create(
    @Param('teamId') teamId: string,
    @Body() createPlayerDto: CreatePlayerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playersService.create(teamId, createPlayerDto, req.user.userId);
  }

  // Get all players for a specific team
  // GET /players/team/:teamId
  @Get('team/:teamId')
  findAllByTeam(
    @Param('teamId') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playersService.findAllByTeamId(teamId, req.user.userId);
  }

  // Get a specific player by their ID, within a specific team
  // GET /players/:playerId/team/:teamId
  @Get(':playerId/team/:teamId')
  findOne(
    @Param('playerId') playerId: string,
    @Param('teamId') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playersService.findOne(playerId, teamId, req.user.userId);
  }

  // Update a specific player
  // PATCH /players/:playerId/team/:teamId
  @Patch(':playerId/team/:teamId')
  update(
    @Param('playerId') playerId: string,
    @Param('teamId') teamId: string,
    @Body() updatePlayerDto: UpdatePlayerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playersService.update(playerId, teamId, updatePlayerDto, req.user.userId);
  }

  // Delete a specific player
  // DELETE /players/:playerId/team/:teamId
  @Delete(':playerId/team/:teamId')
  @HttpCode(HttpStatus.OK) // Or HttpStatus.NO_CONTENT if not returning a body
  remove(
    @Param('playerId') playerId: string,
    @Param('teamId') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playersService.remove(playerId, teamId, req.user.userId);
  }
}
