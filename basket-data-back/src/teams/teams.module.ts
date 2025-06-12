import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { AuthModule } from '../auth/auth.module'; // To use AuthGuard('jwt')
import { Team, TeamSchema } from './schemas/team.schema'; // Import Team and TeamSchema

@Module({
  imports: [
    AuthModule, // Importing AuthModule to make its exported guards available
    MongooseModule.forFeature([{ name: Team.name, schema: TeamSchema }]), // Configure Mongoose
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
