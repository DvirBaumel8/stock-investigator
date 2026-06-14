import { Controller, Get, Query } from '@nestjs/common';
import { TickersService } from './tickers.service';

@Controller('tickers')
export class TickersController {
  constructor(private readonly tickersService: TickersService) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit !== undefined ? parseInt(limit, 10) : undefined;
    const safeLimit =
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined;

    const tickers = await this.tickersService.search(search, safeLimit);

    return tickers.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      exchange: t.exchange,
      assetType: t.assetType,
    }));
  }
}
