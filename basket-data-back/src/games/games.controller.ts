import { Controller, UseGuards, Post, Body, Req, Get, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles: string[];
  };
}

@UseGuards(AuthGuard('jwt'))
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  create(@Body() createGameDto: CreateGameDto, @Req() req: AuthenticatedRequest) {
    return this.gamesService.create(createGameDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.gamesService.findAllByUserId(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.gamesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto, @Req() req: AuthenticatedRequest) {
    return this.gamesService.update(id, updateGameDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.gamesService.remove(id, req.user.userId);
  }

  @Patch(':id/activate')
  setActive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.gamesService.setActive(id, req.user.userId);
  }
}
