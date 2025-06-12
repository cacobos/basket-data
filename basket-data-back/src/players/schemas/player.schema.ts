import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlayerDocument = Player & Document;

@Schema({ timestamps: true })
export class Player {
  @Prop({ required: true })
  name: string;

  @Prop()
  jerseyNumber?: number;

  @Prop()
  position?: string; // e.g., "Point Guard", "Center"

  @Prop()
  height?: string; // e.g., "6'5\"", "195cm"

  // Link to the Team. Using String for teamId.
  // Could also be Types.ObjectId with ref: 'Team' if direct DB population is needed.
  @Prop({ required: true, index: true }) // Indexed for faster queries by teamId
  teamId: string;

  @Prop({ default: true })
  isActive: boolean; // To mark if a player is active for a game/roster
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
