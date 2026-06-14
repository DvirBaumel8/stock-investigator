import { Controller, Param, Post, Sse } from "@nestjs/common";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";

@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(":ticker")
  async createAnalysis(@Param("ticker") ticker: string) {
    const { analysis, cached } =
      await this.analysisService.createOrGetAnalysis(ticker);
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
