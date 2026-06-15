import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';
import { TickersService } from '../src/tickers/tickers.service';
import { Ticker } from '../src/tickers/ticker.entity';

describe('TickersService', () => {
  let service: TickersService;
  let repo: any;
  let mockManager: any;

  beforeEach(async () => {
    mockManager = {
      clear: jest.fn(),
      insert: jest.fn(),
    };

    repo = {
      count: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      manager: {
        transaction: jest.fn(async (cb: (m: typeof mockManager) => Promise<void>) => cb(mockManager)),
      },
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

  describe('replaceAll', () => {
    it('does nothing for an empty list', async () => {
      await service.replaceAll([]);
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('clears the table and inserts all rows inside a transaction', async () => {
      const records = [
        { symbol: 'AAPL', companyName: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ];
      await service.replaceAll(records);

      expect(repo.manager.transaction).toHaveBeenCalled();
      expect(mockManager.clear).toHaveBeenCalledWith(Ticker);
      expect(mockManager.insert).toHaveBeenCalledWith(Ticker, [
        { symbol: 'AAPL', companyName: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ]);
    });

    it('inserts all records in a single call', async () => {
      const records = Array.from({ length: 501 }, (_, i) => ({
        symbol: `SYM${i}`,
        companyName: 'X',
        exchange: 'NYSE',
        assetType: 'Stock',
      }));
      await service.replaceAll(records);
      expect(mockManager.insert).toHaveBeenCalledTimes(1);
      expect(mockManager.insert.mock.calls[0][1]).toHaveLength(501);
    });
  });

  describe('search', () => {
    it('searches by symbol prefix when given a term', async () => {
      await service.search('aap', 5);
      expect(repo.find).toHaveBeenCalledWith({
        where: { symbol: ILike('aap%') },
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

    it('returns tickers ordered by symbol when no term is given', async () => {
      await service.search();
      expect(repo.find).toHaveBeenCalledWith({
        order: { symbol: 'ASC' },
        take: 20,
      });
    });

    it('clamps a non-positive limit up to 1', async () => {
      await service.search('a', 0);
      expect(repo.find.mock.calls[0][0].take).toBe(1);
    });
  });
});
