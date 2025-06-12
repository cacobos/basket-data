import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module'; // Import AuthModule
import { TeamsModule } from './teams/teams.module'; // Import TeamsModule
import { PlayersModule } from './players/players.module'; // Import PlayersModule
import { GamesModule } from './games/games.module'; // Import GamesModule

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/basketballdb'),
    AuthModule,
    TeamsModule,
    PlayersModule,
    GamesModule, // Add GamesModule here
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
