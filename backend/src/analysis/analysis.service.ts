import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { Analysis, AnalysisStatus } from './analysis.entity';
import { AgentResult, AgentResultStatus } from '../agent-result/agent-result.entity';
import { TechnicalAgent } from '../agents/technical/technical.agent';
import { NewsSentimentAgent } from '../agents/news-sentiment/news-sentiment.agent';
import { AgentInterface } from '../agents/agent.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly activeStreams = new Map<string, Subject<MessageEvent>>();
  private readonly agents: AgentInterface[];

  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepo: Repository<Analysis>,
    @InjectRepository(AgentResult)
    private readonly agentResultRepo: Repository<AgentResult>,
    private readonly technicalAgent: TechnicalAgent,
    private readonly newsSentimentAgent: NewsSentimentAgent,
    private readonly configService: ConfigService,
  ) {
    this.agents = [this.technicalAgent, this.newsSentimentAgent];
  }

  async createOrGetAnalysis(
    ticker: string,
  ): Promise<{ analysis: Analysis; cached: boolean }> {
    const normalizedTicker = ticker.toUpperCase().trim();
    const ttlHours = Number(
      this.configService.get<string>('ANALYSIS_CACHE_TTL_HOURS') ?? '24',
    );
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

    const cached = await this.analysisRepo.findOne({
      where: {
        ticker: normalizedTicker,
        status: AnalysisStatus.COMPLETED,
        createdAt: MoreThanOrEqual(cutoff),
      },
      order: { createdAt: 'DESC' },
    });

    if (cached) {
      this.logger.log(`Cache hit for ${normalizedTicker}`);
      return { analysis: cached, cached: true };
    }

    const analysis = await this.analysisRepo.save({
      ticker: normalizedTicker,
      status: AnalysisStatus.RUNNING,
    });

    const subject = new Subject<MessageEvent>();
    this.activeStreams.set(analysis.id, subject);

    this.runAgents(analysis.id, normalizedTicker, subject).catch((err) => {
      this.logger.error(`runAgents crashed for ${analysis.id}: ${(err as Error).message}`);
    });

    return { analysis, cached: false };
  }

  getStream(analysisId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let innerSub: { unsubscribe(): void } | undefined;

      this.analysisRepo
        .findOne({
          where: { id: analysisId },
          relations: ['agentResults'],
        })
        .then(async (analysis) => {
          if (!analysis) {
            subscriber.error(new Error(`Analysis ${analysisId} not found`));
            return;
          }

          if (
            analysis.status === AnalysisStatus.COMPLETED ||
            analysis.status === AnalysisStatus.FAILED
          ) {
            analysis.agentResults.forEach((r) => subscriber.next({ data: r }));
            subscriber.next({ type: 'complete', data: {} } as MessageEvent);
            subscriber.complete();
            return;
          }

          let subject = this.activeStreams.get(analysisId);
          if (!subject) {
            // Race: runAgents may have finished between our findOne and this check.
            // Re-query to get the latest state before erroring.
            const refreshed = await this.analysisRepo.findOne({
              where: { id: analysisId },
              relations: ['agentResults'],
            });
            if (
              refreshed &&
              (refreshed.status === AnalysisStatus.COMPLETED ||
                refreshed.status === AnalysisStatus.FAILED)
            ) {
              refreshed.agentResults.forEach((r) => subscriber.next({ data: r }));
              subscriber.next({ type: 'complete', data: {} } as MessageEvent);
              subscriber.complete();
            } else {
              subscriber.error(
                new Error(`No active stream for running analysis ${analysisId}`),
              );
            }
            return;
          }

          innerSub = subject.subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => innerSub?.unsubscribe();
    });
  }

  private async runAgents(
    analysisId: string,
    ticker: string,
    subject: Subject<MessageEvent>,
  ): Promise<void> {
    const results: AgentResult[] = new Array(this.agents.length);

    try {
      await Promise.all(
        this.agents.map(async (agent, i) => {
          const start = Date.now();
          let result: AgentResult = await this.agentResultRepo.save({
            analysisId,
            agentName: agent.agentName,
            status: AgentResultStatus.PENDING,
          });

          try {
            const output = await agent.analyze(ticker);
            result = await this.agentResultRepo.save({
              ...result,
              status: AgentResultStatus.COMPLETED,
              output,
              durationMs: Date.now() - start,
            });
          } catch (err) {
            this.logger.error(
              `Agent ${agent.agentName} failed for ${ticker} (${analysisId}): ${(err as Error).message}`,
            );
            result = await this.agentResultRepo.save({
              ...result,
              status: AgentResultStatus.FAILED,
              error: (err as Error).message,
              durationMs: Date.now() - start,
            });
          }

          results[i] = result;
          subject.next({ data: result });
        }),
      );

      const anySucceeded = results.some(
        (r) => r.status === AgentResultStatus.COMPLETED,
      );

      await this.analysisRepo.update(analysisId, {
        status: anySucceeded ? AnalysisStatus.COMPLETED : AnalysisStatus.FAILED,
        completedAt: new Date(),
      });

      subject.next({ type: 'complete', data: {} } as MessageEvent);
      subject.complete();
    } catch (err) {
      this.logger.error(`runAgents failed for ${analysisId}: ${(err as Error).message}`);
      subject.error(err);
    } finally {
      this.activeStreams.delete(analysisId);
    }
  }
}
