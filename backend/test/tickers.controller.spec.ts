import { TickersController } from '../src/tickers/tickers.controller';

describe('TickersController', () => {
  let controller: TickersController;
  let tickersService: any;

  beforeEach(() => {
    tickersService = {
      search: jest.fn().mockResolvedValue([
        { symbol: 'AAPL', companyName: 'Apple Inc', assetType: 'Stock' },
      ]),
    };
    controller = new TickersController(tickersService);
  });

  it('passes search and limit to the service', async () => {
    await controller.list('aap', 5);
    expect(tickersService.search).toHaveBeenCalledWith('aap', 5);
  });

  it('passes undefined limit when none is provided', async () => {
    await controller.list('aap', undefined);
    expect(tickersService.search).toHaveBeenCalledWith('aap', undefined);
  });

  it('returns the service result directly', async () => {
    const result = await controller.list(undefined, undefined);
    expect(result).toEqual([
      { symbol: 'AAPL', companyName: 'Apple Inc', assetType: 'Stock' },
    ]);
  });
});
