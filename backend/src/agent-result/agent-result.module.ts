import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentResult } from './agent-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentResult])],
  exports: [TypeOrmModule],
})
export class AgentResultModule {}
