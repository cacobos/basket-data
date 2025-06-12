import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument, GameType } from './schemas/game.schema';
import { TeamsService } from '../teams/teams.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private readonly teamsService: TeamsService,
  ) {}

  private async deactivateOtherGames(userId: string, teamId: string, excludeGameId?: string): Promise<void> {
    const query: any = {
      userId,
      teamId, // Ensure only games for the specific team are considered
      isActive: true
    };
    if (excludeGameId) {
      query._id = { $ne: excludeGameId };
    }
    await this.gameModel.updateMany(query, { $set: { isActive: false } }).exec();
  }

  async create(createGameDto: CreateGameDto, userId: string): Promise<GameDocument> {
    // Verify team ownership
    await this.teamsService.findOne(createGameDto.teamId, userId);

    if (createGameDto['isActive'] === true) { // Check if isActive is explicitly set to true in DTO
      await this.deactivateOtherGames(userId, createGameDto.teamId);
    }

    const newGame = new this.gameModel({
      ...createGameDto,
      date: new Date(createGameDto.date), // Ensure date is stored as Date object
      userId,
      // isActive will default to false if not provided, or use value from DTO
      isActive: createGameDto['isActive'] === true ? true : false,
    });
    return newGame.save();
  }

  async findAllByUserId(userId: string): Promise<GameDocument[]> {
    return this.gameModel.find({ userId }).sort({ date: -1, time: -1 }).exec();
  }

  async findOne(gameId: string, userId: string): Promise<GameDocument> {
    const game = await this.gameModel.findOne({ _id: gameId, userId }).exec();
    if (!game) {
      throw new NotFoundException(`Game with ID "${gameId}" not found or not owned by user.`);
    }
    return game;
  }

  async update(gameId: string, updateGameDto: UpdateGameDto, userId: string): Promise<GameDocument> {
    const game = await this.findOne(gameId, userId); // Ensures ownership

    if (updateGameDto.isActive === true && !game.isActive) {
      // If activating this game, deactivate others for the same team
      await this.deactivateOtherGames(userId, game.teamId.toString(), gameId);
    }

    // Update fields from DTO
    if (updateGameDto.date) {
      updateGameDto.date = new Date(updateGameDto.date) as any; // Ensure date is Date object
    }
    Object.assign(game, updateGameDto);

    return game.save();
  }

  async remove(gameId: string, userId: string): Promise<{ deleted: boolean }> {
    await this.findOne(gameId, userId); // Ensures ownership
    const result = await this.gameModel.deleteOne({ _id: gameId, userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Game with ID "${gameId}" not found or not owned by user.`);
    }
    return { deleted: true };
  }

  async setActive(gameId: string, userId: string): Promise<GameDocument> {
    const game = await this.findOne(gameId, userId); // Ensures ownership
    if (!game.isActive) {
      await this.deactivateOtherGames(userId, game.teamId.toString(), gameId);
      game.isActive = true;
      await game.save();
    }
    return game;
  }
}
