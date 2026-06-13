import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis.entity';
import { AgentResult } from '../agent-result/agent-result.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TechnicalModule } from '../agents/technical/technical.module';
import { NewsSentimentModule } from '../agents/news-sentiment/news-sentiment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis, AgentResult]),
    TechnicalModule,
    NewsSentimentModule,
  ],
  providers: [AnalysisService],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
