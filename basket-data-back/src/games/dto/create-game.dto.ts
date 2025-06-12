import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsMongoId } from 'class-validator';
import { GameType } from '../schemas/game.schema';

export class CreateGameDto {
  @IsDateString()
  @IsNotEmpty()
  date: string; // ISO Date string

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsNotEmpty()
  opponent: string;

  @IsEnum(GameType)
  @IsOptional()
  type?: GameType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsMongoId() // Validates if the string is a MongoDB ObjectId
  @IsNotEmpty()
  teamId: string;
}
