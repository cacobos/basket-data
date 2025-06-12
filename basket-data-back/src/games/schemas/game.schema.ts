import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

export enum GameType {
  FRIENDLY = 'friendly',
  LEAGUE = 'league',
  TOURNAMENT = 'tournament',
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ required: true })
  date: Date;

  @Prop()
  time?: string; // e.g., "19:00"

  @Prop({ required: true })
  opponent: string;

  @Prop({ type: String, enum: GameType, default: GameType.FRIENDLY })
  type: GameType;

  @Prop()
  location?: string;

  @Prop({ required: true, index: true })
  teamId: string; // User's team participating

  @Prop({ required: true, index: true })
  userId: string; // User who created/owns this game entry

  @Prop({ default: false })
  isActive: boolean; // To mark a game as currently active for live tracking
}

export const GameSchema = SchemaFactory.createForClass(Game);
