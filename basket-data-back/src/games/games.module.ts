import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { AuthModule } from '../auth/auth.module';
import { TeamsModule } from '../teams/teams.module';
import { Game, GameSchema } from './schemas/game.schema'; // Import Game schema

@Module({
  imports: [
    AuthModule,
    TeamsModule,
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]), // Configure Mongoose
  ],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
