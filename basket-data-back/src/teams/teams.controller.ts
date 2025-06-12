import { Controller, UseGuards, Post, Body, Req, Get, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    roles: string[];
  };
}

@UseGuards(AuthGuard('jwt')) // Protect all routes in this controller
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto, @Req() req: AuthenticatedRequest) {
    return this.teamsService.create(createTeamDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.teamsService.findAllByUserId(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.teamsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto, @Req() req: AuthenticatedRequest) {
    return this.teamsService.update(id, updateTeamDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK) // Or HttpStatus.NO_CONTENT if not returning a body
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.teamsService.remove(id, req.user.userId);
  }
}
