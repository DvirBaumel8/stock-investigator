import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Ticker } from './ticker.entity';
import { TickerRecord } from './alpha-vantage-ticker.provider';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface TickerResponse {
  symbol: string;
  companyName: string;
  assetType: string;
}

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

    await this.tickerRepo.manager.transaction(async (manager) => {
      await manager.clear(Ticker);
      await manager.insert(Ticker, records);
    });
  }

  async search(search?: string, limit?: number): Promise<TickerResponse[]> {
    const calculatedLimit = this.getCalculatedLimit(limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
    const normalizedSearch = search?.trim();
    const tickers = normalizedSearch
      ? await this.tickerRepo.find({ where: { symbol: ILike(`${normalizedSearch}%`) }, order: { symbol: 'ASC' }, take: calculatedLimit })
      : await this.tickerRepo.find({ order: { symbol: 'ASC' }, take: calculatedLimit });

    return tickers.map(({ symbol, companyName, assetType }) => ({
      symbol,
      companyName,
      assetType,
    }));
  }

  private getCalculatedLimit(limit: number, min: number, max: number): number {
    return Math.min(Math.max(limit, min), max);
  }
}
