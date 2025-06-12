import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { AuthModule } from '../auth/auth.module';
import { TeamsModule } from '../teams/teams.module'; // Import TeamsModule
import { Player, PlayerSchema } from './schemas/player.schema'; // Import Player schema

@Module({
  imports: [
    AuthModule,
    TeamsModule,
    MongooseModule.forFeature([{ name: Player.name, schema: PlayerSchema }]), // Configure Mongoose
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
