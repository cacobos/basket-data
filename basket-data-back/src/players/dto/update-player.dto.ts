import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdatePlayerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  jerseyNumber?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  height?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
