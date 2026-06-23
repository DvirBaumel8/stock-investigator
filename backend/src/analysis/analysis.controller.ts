import { Controller, Logger, Param, Post, Sse } from "@nestjs/common";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";

@Controller("analysis")
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Post(":ticker")
  async createAnalysis(@Param("ticker") ticker: string) {
    this.logger.log(`POST /analysis/${ticker}`);
    const { analysis, cached } =
      await this.analysisService.createOrGetAnalysis(ticker);
    this.logger.log(
      `Returning analysis ${analysis.id} for ${ticker} (cached=${cached})`,
    );
    return {
      id: analysis.id,
      ticker: analysis.ticker,
      status: analysis.status,
      cached,
      createdAt: analysis.createdAt,
    };
  }

  @Sse(":id/stream")
  streamAnalysis(@Param("id") id: string): Observable<MessageEvent> {
    return this.analysisService.getStream(id);
  }
}
