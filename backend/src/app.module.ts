import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis/analysis.entity';
import { AgentResult } from './agent-result/agent-result.entity';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Analysis, AgentResult],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AnalysisModule,
  ],
})
export class AppModule {}
