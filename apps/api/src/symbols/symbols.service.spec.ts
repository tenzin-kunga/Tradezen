import { Test, type TestingModule } from '@nestjs/testing';
import { SymbolsService } from './symbols.service';

jest.mock('../db/drizzle', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

import { db } from '../db/drizzle';

const mockDb = db as unknown as {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

function mockQueryChain(finalResult: unknown[]) {
  const chain: Record<string, jest.Mock> = {};

  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(finalResult);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockReturnValue(finalResult);

  return chain;
}

describe('SymbolsService', () => {
  let service: SymbolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolsService],
    }).compile();

    service = module.get(SymbolsService);
    jest.clearAllMocks();
  });

  describe('getSymbolKey', () => {
    it('should build key from ticker and exchange', () => {
      expect(service.getSymbolKey('AAPL', 'NASDAQ')).toBe('NASDAQ:AAPL');
    });

    it('should use UNKNOWN when no exchange', () => {
      expect(service.getSymbolKey('AAPL')).toBe('UNKNOWN:AAPL');
    });

    it('should uppercase ticker', () => {
      expect(service.getSymbolKey('aapl')).toBe('UNKNOWN:AAPL');
    });
  });

  describe('lookupOrCreate', () => {
    it('should return existing symbol if found', async () => {
      mockDb.select.mockReturnValue(
        mockQueryChain([{ id: 's1', symbolKey: 'NASDAQ:AAPL' }]),
      );

      const result = await service.lookupOrCreate('AAPL', 'NASDAQ');
      expect(result).toEqual({ id: 's1', symbolKey: 'NASDAQ:AAPL' });

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should create new symbol if not found', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));
      mockDb.insert.mockReturnValue(
        mockQueryChain([{ id: 's2', symbolKey: 'UNKNOWN:TSLA' }]),
      );

      const result = await service.lookupOrCreate('TSLA');
      expect(result).toEqual({ id: 's2', symbolKey: 'UNKNOWN:TSLA' });
    });
  });

  describe('search', () => {
    it('should return empty for short query', async () => {
      const result = await service.search('');
      expect(result).toEqual([]);
    });

    it('should search by ticker/name', async () => {
      const results = [
        {
          id: 's1',
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          name: 'Apple',
          contractSize: 100000,
        },
      ];
      mockDb.select.mockReturnValue(mockQueryChain(results));

      const result = await service.search('AAPL');
      expect(result).toEqual(results);
    });
  });

  describe('getById', () => {
    it('should return symbol if found', async () => {
      const symbol = { id: 's1', ticker: 'AAPL' };
      mockDb.select.mockReturnValue(mockQueryChain([symbol]));

      const result = await service.getById('s1');
      expect(result).toEqual(symbol);
    });

    it('should return null if not found', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));

      const result = await service.getById('missing');
      expect(result).toBeNull();
    });
  });

  describe('enrich', () => {
    it('should return null for nonexistent symbol', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));

      const result = await service.enrich('missing');
      expect(result).toBeNull();
    });

    it('should update and return enriched symbol', async () => {
      const symbol = {
        id: 's1',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        name: null,
        assetType: null,
        currency: null,
        providerMetadata: {},
      };
      mockDb.select
        .mockReturnValueOnce(mockQueryChain([symbol])) // getById
        .mockReturnValueOnce(
          mockQueryChain([{ ...symbol, name: 'Apple Inc.' }]),
        ); // getById after update
      mockDb.update.mockReturnValue(mockQueryChain([]));

      const result = await service.enrich('s1');
      expect(result?.name).toBe('Apple Inc.');
    });
  });
});
