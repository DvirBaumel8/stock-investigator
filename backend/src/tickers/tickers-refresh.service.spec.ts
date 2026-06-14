import { TickersRefreshService } from './tickers-refresh.service';

describe('TickersRefreshService', () => {
  let provider: any;
  let tickersService: any;
  let service: TickersRefreshService;

  beforeEach(() => {
    provider = { fetchActiveTickers: jest.fn().mockResolvedValue([]) };
    tickersService = {
      count: jest.fn().mockResolvedValue(0),
      upsertMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new TickersRefreshService(provider, tickersService);
  });

  describe('onModuleInit', () => {
    it('seeds when the table is empty', async () => {
      tickersService.count.mockResolvedValueOnce(0);
      const spy = jest.spyOn(service, 'refresh').mockResolvedValue();
      await service.onModuleInit();
      expect(spy).toHaveBeenCalled();
    });

    it('does not seed when the table already has tickers', async () => {
      tickersService.count.mockResolvedValueOnce(5);
      const spy = jest.spyOn(service, 'refresh').mockResolvedValue();
      await service.onModuleInit();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('fetches records and upserts them with a run timestamp', async () => {
      const records = [
        { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ];
      provider.fetchActiveTickers.mockResolvedValueOnce(records);

      await service.refresh();

      expect(provider.fetchActiveTickers).toHaveBeenCalled();
      expect(tickersService.upsertMany).toHaveBeenCalledWith(
        records,
        expect.any(Date),
      );
    });

    it('does not throw and leaves data intact when the provider fails', async () => {
      provider.fetchActiveTickers.mockRejectedValueOnce(new Error('rate limit'));
      await expect(service.refresh()).resolves.toBeUndefined();
      expect(tickersService.upsertMany).not.toHaveBeenCalled();
    });

    it('skips when a refresh is already running', async () => {
      (service as any).isRunning = true;
      await service.refresh();
      expect(provider.fetchActiveTickers).not.toHaveBeenCalled();
    });
  });
});
