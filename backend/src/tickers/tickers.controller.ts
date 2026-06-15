import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { TickersService } from './tickers.service';

interface TickerResponse {
  symbol: string;
  companyName: string;
  exchange: string;
  assetType: string;
}

@Controller('tickers')
export class TickersController {
  constructor(private readonly tickersService: TickersService) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TickerResponse[]> {
    const tickers = await this.tickersService.search(search, limit);

    return tickers.map((t) => ({
      symbol: t.symbol,
      companyName: t.companyName,
      exchange: t.exchange,
      assetType: t.assetType,
    }));
  }
}
