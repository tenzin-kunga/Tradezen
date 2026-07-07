import { SymbolProvider, SymbolData } from "./symbol-provider.interface";

export class SymbolProviderChain {
  private providers: SymbolProvider[] = [];

  register(provider: SymbolProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  async lookup(ticker: string, exchange?: string): Promise<SymbolData | null> {
    for (const provider of this.providers) {
      try {
        const result = await provider.lookup(ticker, exchange);
        if (result) return result;
      } catch {
        // Continue to next provider
      }
    }
    return null;
  }

  async search(query: string): Promise<SymbolData[]> {
    for (const provider of this.providers) {
      try {
        const results = await provider.search(query);
        if (results.length > 0) return results;
      } catch {
        // Continue to next provider
      }
    }
    return [];
  }

  async enrich(ticker: string, exchange?: string): Promise<Partial<SymbolData> | null> {
    for (const provider of this.providers) {
      if (provider.enrich) {
        try {
          const result = await provider.enrich(ticker, exchange);
          if (result) return result;
        } catch {
          // Continue to next provider
        }
      }
    }
    return null;
  }

  getProviders(): SymbolProvider[] {
    return [...this.providers];
  }
}
