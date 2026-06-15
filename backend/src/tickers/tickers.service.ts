import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Ticker } from './ticker.entity';
import { TickerRecord } from './alpha-vantage-ticker.provider';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class TickersService {
  constructor(
    @InjectRepository(Ticker)
    private readonly tickerRepo: Repository<Ticker>,
  ) {}

  count(): Promise<number> {
    return this.tickerRepo.count();
  }

  async replaceAll(records: TickerRecord[]): Promise<void> {
    if (records.length === 0) return;

    const rows = records.map((r) => ({
      symbol: r.symbol,
      companyName: r.companyName,
      exchange: r.exchange,
      assetType: r.assetType,
    }));

    await this.tickerRepo.manager.transaction(async (manager) => {
      await manager.clear(Ticker);
      await manager.insert(Ticker, rows);
    });
  }

  async search(search?: string, limit?: number): Promise<Ticker[]> {
    const take = this.clamp(limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
    const term = search?.trim();
    if (term) {
      return this.tickerRepo.find({
        where: { symbol: ILike(`${term}%`) },
        order: { symbol: 'ASC' },
        take,
      });
    }

    return this.tickerRepo.find({
      order: { symbol: 'ASC' },
      take,
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
