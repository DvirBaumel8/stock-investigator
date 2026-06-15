import { TickersRefreshService } from '../src/tickers/tickers-refresh.service';

describe('TickersRefreshService', () => {
  let provider: any;
  let tickersService: any;
  let service: TickersRefreshService;

  beforeEach(() => {
    provider = { fetchActiveTickers: jest.fn().mockResolvedValue([]) };
    tickersService = {
      count: jest.fn().mockResolvedValue(0),
      replaceAll: jest.fn().mockResolvedValue(undefined),
    };
    service = new TickersRefreshService(provider, tickersService);
  });

  describe('onModuleInit', () => {
    it('seeds when the table is empty without blocking boot', async () => {
      let resolveRefresh!: () => void;
      const spy = jest.spyOn(service, 'refresh').mockReturnValue(
        new Promise<void>((res) => {
          resolveRefresh = res;
        }),
      );
      await service.onModuleInit(); // must resolve even though refresh is still pending
      expect(spy).toHaveBeenCalled();
      resolveRefresh(); // cleanup the pending promise
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
        { symbol: 'AAPL', companyName: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ];
      provider.fetchActiveTickers.mockResolvedValueOnce(records);

      await service.refresh();

      expect(provider.fetchActiveTickers).toHaveBeenCalled();
      expect(tickersService.replaceAll).toHaveBeenCalledWith(records);
    });

    it('does not throw and leaves data intact when the provider fails', async () => {
      provider.fetchActiveTickers.mockRejectedValueOnce(new Error('rate limit'));
      await expect(service.refresh()).resolves.toBeUndefined();
      expect(tickersService.replaceAll).not.toHaveBeenCalled();
    });

    it('skips when a refresh is already running', async () => {
      (service as any).isRunning = true;
      await service.refresh();
      expect(provider.fetchActiveTickers).not.toHaveBeenCalled();
    });

    it('does not throw when upsertMany fails', async () => {
      provider.fetchActiveTickers.mockResolvedValueOnce([
        { symbol: 'AAPL', companyName: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ]);
      tickersService.replaceAll.mockRejectedValueOnce(new Error('DB timeout'));
      await expect(service.refresh()).resolves.toBeUndefined();
    });
  });
});
