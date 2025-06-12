import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose'; // Import Types for ObjectId if using

export type TeamDocument = Team & Document;

@Schema({ timestamps: true }) // Enables createdAt and updatedAt
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop()
  coach?: string;

  // Storing userId as a string. Could also be Types.ObjectId with ref: 'User'
  // if you have a User model and want direct DB population/references.
  // For this iteration, string is fine.
  @Prop({ required: true })
  userId: string;

  // Consider adding players array later:
  // @Prop([{ type: Types.ObjectId, ref: 'Player' }]) // Example if you have a Player schema
  // players: Types.ObjectId[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);
