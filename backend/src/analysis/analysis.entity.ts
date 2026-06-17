import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { AgentResult } from "../agent-result/agent-result.entity";

export enum AnalysisStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity("analyses")
export class Analysis {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 10 })
  ticker: string;

  @Column({
    type: "enum",
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date | null;

  @OneToMany(() => AgentResult, (result) => result.analysis, { eager: false })
  agentResults: AgentResult[];
}
