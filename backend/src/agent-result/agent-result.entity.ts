import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Analysis } from '../analysis/analysis.entity';

export enum AgentResultStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('agent_results')
export class AgentResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'analysis_id' })
  analysisId: string;

  @ManyToOne(() => Analysis, (analysis) => analysis.agentResults)
  @JoinColumn({ name: 'analysis_id' })
  analysis: Analysis;

  @Column({ name: 'agent_name', length: 50 })
  agentName: string;

  @Column({
    type: 'enum',
    enum: AgentResultStatus,
    default: AgentResultStatus.PENDING,
  })
  status: AgentResultStatus;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
