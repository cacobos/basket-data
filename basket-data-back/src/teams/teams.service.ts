import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(createTeamDto: CreateTeamDto, userId: string): Promise<TeamDocument> {
    const newTeam = new this.teamModel({
      ...createTeamDto,
      userId,
    });
    return newTeam.save();
  }

  async findAllByUserId(userId: string): Promise<TeamDocument[]> {
    return this.teamModel.find({ userId }).exec();
  }

  async findOne(id: string, userId: string): Promise<TeamDocument> {
    const team = await this.teamModel.findOne({ _id: id, userId }).exec();
    if (!team) {
      throw new NotFoundException(`Team with ID "${id}" not found or not owned by user.`);
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, userId: string): Promise<TeamDocument> {
    const existingTeam = await this.findOne(id, userId); // Ensures ownership and existence

    // Update fields that are present in the DTO
    if (updateTeamDto.name !== undefined) {
      existingTeam.name = updateTeamDto.name;
    }
    if (updateTeamDto.coach !== undefined) {
      existingTeam.coach = updateTeamDto.coach;
    }
    // For Mongoose, ensure you only set fields that are actually in the DTO
    // or use Object.assign / spread operator carefully if your DTO matches schema structure
    // Object.assign(existingTeam, updateTeamDto); // Alternative if DTO matches schema fields

    return existingTeam.save();
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean; message?: string }> {
    const team = await this.findOne(id, userId); // Ensures ownership and existence
    const result = await this.teamModel.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) {
      // This case should ideally be caught by findOne, but as a safeguard:
      throw new NotFoundException(`Team with ID "${id}" not found or not owned by user for deletion.`);
    }
    return { deleted: true };
  }
}
