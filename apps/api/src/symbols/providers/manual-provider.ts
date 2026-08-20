import { SymbolProvider, SymbolData } from './symbol-provider.interface';

export class ManualProvider implements SymbolProvider {
  name = 'manual';
  priority = 100; // lowest priority — fallback only

  lookup(ticker: string, exchange?: string): Promise<SymbolData | null> {
    // Manual provider returns minimal data — just the ticker
    return Promise.resolve({
      ticker: ticker.toUpperCase(),
      exchange: exchange?.toUpperCase(),
    });
  }

  search(_query: string): Promise<SymbolData[]> {
    // Manual provider can't search — returns empty
    return Promise.resolve([]);
  }
}
