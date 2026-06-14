import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticker } from './ticker.entity';
import { TickersService } from './tickers.service';
import { TickersController } from './tickers.controller';
import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';
import { TickersRefreshService } from './tickers-refresh.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticker])],
  providers: [
    TickersService,
    AlphaVantageTickerProvider,
    TickersRefreshService,
  ],
  controllers: [TickersController],
})
export class TickersModule {}
