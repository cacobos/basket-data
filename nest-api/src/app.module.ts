import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { FebController } from './feb.controller';
import { FebService } from './feb.service';

@Module({
  imports: [],
  controllers: [AppController, FebController, AnalysisController],
  providers: [AppService, FebService, AnalysisService, FirebaseAuthGuard],
})
export class AppModule {}
