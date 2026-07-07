export interface SymbolData {
  ticker: string;
  exchange?: string;
  assetType?: string;
  currency?: string;
  name?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface SymbolProvider {
  name: string;
  priority: number;
  lookup(ticker: string, exchange?: string): Promise<SymbolData | null>;
  search(query: string): Promise<SymbolData[]>;
  enrich?(ticker: string, exchange?: string): Promise<Partial<SymbolData>>;
}
