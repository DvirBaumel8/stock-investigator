import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';
import { TickersService } from './tickers.service';

@Injectable()
export class TickersRefreshService implements OnModuleInit {
  private readonly logger = new Logger(TickersRefreshService.name);
  private isRunning = false;

  constructor(
    private readonly provider: AlphaVantageTickerProvider,
    private readonly tickersService: TickersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.tickersService.count();
    if (count === 0) {
      this.logger.log('Tickers table is empty — seeding on startup');
      // Run in the background so we do not block application boot.
      void this.refresh();
    }
  }

  // EVERY_WEEK = '0 0 * * 0' — Sundays at 00:00.
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyRefresh(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Ticker refresh already in progress — skipping');
      return;
    }
    this.isRunning = true;
    const runAt = new Date();
    try {
      const records = await this.provider.fetchActiveTickers();
      await this.tickersService.upsertMany(records, runAt);
      this.logger.log(`Ticker refresh complete: ${records.length} active tickers`);
    } catch (err) {
      this.logger.error(`Ticker refresh failed: ${(err as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
