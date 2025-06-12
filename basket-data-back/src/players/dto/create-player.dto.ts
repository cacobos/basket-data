import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  jerseyNumber?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  height?: string;

  // teamId will be taken from route params for POST /players/team/:teamId
  // and not from the body for this DTO.
}
