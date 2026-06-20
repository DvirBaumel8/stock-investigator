import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { TickersService, TickerResponse } from "./tickers.service";

@Controller("tickers")
export class TickersController {
  constructor(private readonly tickersService: TickersService) {}

  @Get()
  async list(
    @Query("search") search?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TickerResponse[]> {
    return this.tickersService.search(search, limit);
  }
}
