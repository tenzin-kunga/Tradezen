import { SymbolProvider, SymbolData } from "./symbol-provider.interface";

export class ManualProvider implements SymbolProvider {
  name = "manual";
  priority = 100; // lowest priority — fallback only

  async lookup(ticker: string, exchange?: string): Promise<SymbolData | null> {
    // Manual provider returns minimal data — just the ticker
    return {
      ticker: ticker.toUpperCase(),
      exchange: exchange?.toUpperCase(),
    };
  }

  async search(query: string): Promise<SymbolData[]> {
    // Manual provider can't search — returns empty
    return [];
  }
}
