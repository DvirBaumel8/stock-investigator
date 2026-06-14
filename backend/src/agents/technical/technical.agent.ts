import { Injectable } from "@nestjs/common";
import { AgentInterface } from "../agent.interface";

@Injectable()
export class TechnicalAgent implements AgentInterface {
  readonly agentName = "technical";

  async analyze(ticker: string): Promise<Record<string, unknown>> {
    return {
      ticker,
      note: "Stub — real implementation (Yahoo Finance + RSI/MACD) coming in a future phase",
      currentPrice: null,
      rsi14: null,
      macd: null,
      ma50: null,
      ma200: null,
      signals: [],
    };
  }
}
