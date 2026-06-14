import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';

const makeProvider = (apiKey: string | null = 'KEY') =>
  new AlphaVantageTickerProvider({
    get: () => apiKey ?? undefined,
  } as any);

const CSV = [
  'symbol,name,exchange,assetType,ipoDate,delistingDate,status',
  'AAPL,Apple Inc,NASDAQ,Stock,1980-12-12,null,Active',
  'SPY,SPDR S&P 500 ETF Trust,NYSE ARCA,ETF,1993-01-29,null,Active',
  'WARR,Warrant Co,NYSE,Warrant,2020-01-01,null,Active',
  'BRKA,"Berkshire, Hathaway",NYSE,Stock,1980-01-01,null,Active',
].join('\n');

describe('AlphaVantageTickerProvider', () => {
  describe('parseCsv', () => {
    it('parses Stock and ETF rows into records', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records).toContainEqual({
        symbol: 'AAPL',
        name: 'Apple Inc',
        exchange: 'NASDAQ',
        assetType: 'Stock',
      });
      expect(records).toContainEqual({
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        exchange: 'NYSE ARCA',
        assetType: 'ETF',
      });
    });

    it('filters out non-Stock/ETF asset types', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records.find((r) => r.symbol === 'WARR')).toBeUndefined();
    });

    it('handles commas inside the name field', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records).toContainEqual({
        symbol: 'BRKA',
        name: 'Berkshire, Hathaway',
        exchange: 'NYSE',
        assetType: 'Stock',
      });
    });

    it('throws when Alpha Vantage returns a JSON error/rate-limit body', () => {
      const body = '{ "Information": "rate limit reached" }';
      expect(() => makeProvider().parseCsv(body)).toThrow(/non-CSV/);
    });
  });

  describe('fetchActiveTickers', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws when the API key is missing', async () => {
      await expect(makeProvider(null).fetchActiveTickers()).rejects.toThrow(
        /ALPHA_VANTAGE_API_KEY/,
      );
    });

    it('fetches and parses the CSV body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => CSV,
      }) as any;

      const records = await makeProvider().fetchActiveTickers();
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
        'function=LISTING_STATUS',
      );
      expect(records.find((r) => r.symbol === 'AAPL')).toBeDefined();
    });
  });
});
