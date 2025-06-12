import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { GameType } from '../schemas/game.schema';

export class UpdateGameDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  opponent?: string;

  @IsEnum(GameType)
  @IsOptional()
  type?: GameType;

  @IsString()
  @IsOptional()
  location?: string;

  // teamId generally shouldn't be updated for an existing game.
  // It's tied to the game record upon creation.

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
