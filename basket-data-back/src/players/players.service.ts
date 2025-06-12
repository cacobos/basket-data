import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from './schemas/player.schema';
import { TeamsService } from '../teams/teams.service'; // Import TeamsService
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    private readonly teamsService: TeamsService, // Inject TeamsService
  ) {}

  async create(teamId: string, createPlayerDto: CreatePlayerDto, userId: string): Promise<PlayerDocument> {
    // Verify user owns the team
    await this.teamsService.findOne(teamId, userId);
    // If findOne doesn't throw, user owns the team

    const newPlayer = new this.playerModel({
      ...createPlayerDto,
      teamId, // Assign teamId from parameter
    });
    return newPlayer.save();
  }

  async findAllByTeamId(teamId: string, userId: string): Promise<PlayerDocument[]> {
    // Verify user owns the team
    await this.teamsService.findOne(teamId, userId);

    return this.playerModel.find({ teamId }).exec();
  }

  async findOne(playerId: string, teamId: string, userId: string): Promise<PlayerDocument> {
    // Verify user owns the team first
    await this.teamsService.findOne(teamId, userId);

    const player = await this.playerModel.findOne({ _id: playerId, teamId }).exec();
    if (!player) {
      throw new NotFoundException(`Player with ID "${playerId}" not found in team "${teamId}".`);
    }
    return player;
  }

  async update(playerId: string, teamId: string, updatePlayerDto: UpdatePlayerDto, userId: string): Promise<PlayerDocument> {
    // Verify user owns the team and player exists in that team
    const existingPlayer = await this.findOne(playerId, teamId, userId);

    // Update fields from DTO
    Object.assign(existingPlayer, updatePlayerDto);

    return existingPlayer.save();
  }

  async remove(playerId: string, teamId: string, userId: string): Promise<{ deleted: boolean }> {
    // Verify user owns the team and player exists
    await this.findOne(playerId, teamId, userId);

    const result = await this.playerModel.deleteOne({ _id: playerId, teamId }).exec();
    if (result.deletedCount === 0) {
      // This should ideally be caught by findOne, but as a safeguard
      throw new NotFoundException(`Player with ID "${playerId}" could not be deleted or was not found in team "${teamId}".`);
    }
    return { deleted: true };
  }
}
