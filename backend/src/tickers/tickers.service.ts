import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, LessThan } from 'typeorm';
import { Ticker } from './ticker.entity';
import { TickerRecord } from './alpha-vantage-ticker.provider';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UPSERT_CHUNK = 500;

@Injectable()
export class TickersService {
  constructor(
    @InjectRepository(Ticker)
    private readonly tickerRepo: Repository<Ticker>,
  ) {}

  count(): Promise<number> {
    return this.tickerRepo.count();
  }

  async upsertMany(records: TickerRecord[], runAt: Date): Promise<void> {
    if (records.length === 0) return;

    const rows = records.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange,
      assetType: r.assetType,
      active: true,
      lastSeenAt: runAt,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      await this.tickerRepo.upsert(rows.slice(i, i + UPSERT_CHUNK), ['symbol']);
    }

    // Symbols not present in this refresh are soft-delisted.
    await this.tickerRepo.update(
      { lastSeenAt: LessThan(runAt) },
      { active: false },
    );
  }

  async search(search?: string, limit?: number): Promise<Ticker[]> {
    const take = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    const term = search?.trim();
    if (term) {
      const q = this.escapeLike(term);
      return this.tickerRepo.find({
        where: [
          { active: true, symbol: ILike(`${q}%`) },
          { active: true, name: ILike(`%${q}%`) },
        ],
        order: { symbol: 'ASC' },
        take,
      });
    }

    return this.tickerRepo.find({
      where: { active: true },
      order: { symbol: 'ASC' },
      take,
    });
  }

  private escapeLike(input: string): string {
    return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  }
}
