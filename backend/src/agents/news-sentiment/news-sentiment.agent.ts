import { Injectable } from '@nestjs/common';
import { AgentInterface } from '../agent.interface';

@Injectable()
export class NewsSentimentAgent implements AgentInterface {
  readonly agentName = 'news_sentiment';

  async analyze(ticker: string): Promise<Record<string, unknown>> {
    return {
      ticker,
      note: 'Stub — real implementation (Alpha Vantage + Claude Opus 4.8) coming in a future phase',
      overallSentiment: null,
      sentimentScore: null,
      summary: null,
      keyFactors: [],
      topHeadlines: [],
    };
  }
}
