import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface TickerRecord {
  symbol: string;
  companyName: string;
  exchange: string;
  assetType: string;
}

@Injectable()
export class AlphaVantageTickerProvider {
  private readonly logger = new Logger(AlphaVantageTickerProvider.name);
  private readonly baseUrl = "https://www.alphavantage.co/query";

  constructor(private readonly configService: ConfigService) {}

  async fetchActiveTickers(): Promise<TickerRecord[]> {
    const apiKey = this.configService.get<string>("ALPHA_VANTAGE_API_KEY");
    if (!apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    }
    const url = `${this.baseUrl}?function=LISTING_STATUS&state=active&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: HTTP ${response.status}`);
    }
    const body = await response.text();
    const records = this.parseCsv(body);
    this.logger.log(
      `Fetched ${records.length} active Stock/ETF tickers from Alpha Vantage`,
    );
    return records;
  }

  // Columns: symbol,name,exchange,assetType,ipoDate,delistingDate,status
  // Names can contain commas, so anchor fields from the end (status is last).
  parseCsv(body: string): TickerRecord[] {
    const trimmed = body.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      throw new Error(
        `Alpha Vantage returned a non-CSV response: ${trimmed.slice(0, 200)}`,
      );
    }

    const lines = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const header = lines[0]?.toLowerCase();
    if (!header || !header.startsWith("symbol,")) {
      throw new Error(
        `Unexpected Alpha Vantage CSV header: ${header ?? "(empty)"}`,
      );
    }

    const records: TickerRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 7) continue;

      const symbol = cols[0].trim();
      const assetType = cols[cols.length - 4].trim();
      const exchange = cols[cols.length - 5].trim();
      const companyName = cols
        .slice(1, cols.length - 5)
        .join(",")
        .trim()
        .replace(/^"|"$/g, "");

      if (!symbol) continue;
      if (assetType !== "Stock" && assetType !== "ETF") continue;

      records.push({ symbol, companyName, exchange, assetType });
    }
    return records;
  }
}
