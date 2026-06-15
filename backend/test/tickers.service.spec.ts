import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike, LessThan } from 'typeorm';
import { TickersService } from '../src/tickers/tickers.service';
import { Ticker } from '../src/tickers/ticker.entity';

describe('TickersService', () => {
  let service: TickersService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickersService,
        { provide: getRepositoryToken(Ticker), useValue: repo },
      ],
    }).compile();

    service = module.get<TickersService>(TickersService);
  });

  describe('count', () => {
    it('delegates to the repository', async () => {
      repo.count.mockResolvedValueOnce(42);
      expect(await service.count()).toBe(42);
    });
  });

  describe('upsertMany', () => {
    it('does nothing for an empty list', async () => {
      await service.upsertMany([], new Date());
      expect(repo.upsert).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('upserts rows with active=true and lastSeenAt=runAt, conflict on symbol', async () => {
      const runAt = new Date('2026-06-14T00:00:00Z');
      await service.upsertMany(
        [{ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' }],
        runAt,
      );
      expect(repo.upsert).toHaveBeenCalledWith(
        [
          {
            symbol: 'AAPL',
            name: 'Apple Inc',
            exchange: 'NASDAQ',
            assetType: 'Stock',
            active: true,
            lastSeenAt: runAt,
          },
        ],
        ['symbol'],
      );
    });

    it('soft-delists symbols not seen in this run', async () => {
      const runAt = new Date('2026-06-14T00:00:00Z');
      await service.upsertMany(
        [{ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' }],
        runAt,
      );
      expect(repo.update).toHaveBeenCalledWith(
        { lastSeenAt: LessThan(runAt) },
        { active: false },
      );
    });

    it('upserts in chunks of 500', async () => {
      const records = Array.from({ length: 501 }, (_, i) => ({
        symbol: `SYM${i}`,
        name: 'X',
        exchange: 'NYSE',
        assetType: 'Stock',
      }));
      await service.upsertMany(records, new Date());
      expect(repo.upsert).toHaveBeenCalledTimes(2);
      expect(repo.upsert.mock.calls[0][0]).toHaveLength(500);
      expect(repo.upsert.mock.calls[1][0]).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('searches by symbol prefix when given a term', async () => {
      await service.search('aap', 5);
      expect(repo.find).toHaveBeenCalledWith({
        where: [
          { active: true, symbol: ILike('aap%') },
        ],
        order: { symbol: 'ASC' },
        take: 5,
      });
    });

    it('clamps the limit to the max of 100', async () => {
      await service.search('a', 9999);
      expect(repo.find.mock.calls[0][0].take).toBe(100);
    });

    it('uses the default limit of 20 when none is given', async () => {
      await service.search('a');
      expect(repo.find.mock.calls[0][0].take).toBe(20);
    });

    it('returns active tickers ordered by symbol when no term is given', async () => {
      await service.search();
      expect(repo.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { symbol: 'ASC' },
        take: 20,
      });
    });

    it('escapes ILIKE special characters in the search term', async () => {
      await service.search('a%b_c', 5);
      expect(repo.find.mock.calls[0][0].where[0].symbol).toEqual(
        ILike('a\\%b\\_c%'),
      );
    });

    it('escapes a literal backslash in the search term', async () => {
      await service.search('a\\b', 5);
      expect(repo.find.mock.calls[0][0].where[0].symbol).toEqual(
        ILike('a\\\\b%'),
      );
    });

    it('clamps a non-positive limit up to 1', async () => {
      await service.search('a', 0);
      expect(repo.find.mock.calls[0][0].take).toBe(1);
    });
  });
});
