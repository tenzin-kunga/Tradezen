import { Test, type TestingModule } from '@nestjs/testing';
import { WatchlistService } from './watchlist.service';
import { SymbolsService } from '../symbols/symbols.service';

jest.mock('../db/drizzle', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { db } from '../db/drizzle';

const mockDb = db as unknown as {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

function mockQueryChain(finalResult: unknown[]) {
  const chain: Record<string, jest.Mock> = {};

  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(finalResult);
  chain.limit = jest.fn().mockReturnValue(finalResult);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockReturnValue(finalResult);

  return chain;
}

describe('WatchlistService', () => {
  let service: WatchlistService;
  let symbolsService: { lookupOrCreate: jest.Mock };

  beforeEach(async () => {
    symbolsService = { lookupOrCreate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: SymbolsService, useValue: symbolsService },
      ],
    }).compile();

    service = module.get(WatchlistService);
    jest.clearAllMocks();
  });

  describe('listWatchlists', () => {
    it('should return watchlists for a user', async () => {
      const mockWatchlists = [{ id: 'w1', name: 'Default', userId: 'u1' }];
      mockDb.select.mockReturnValue(mockQueryChain(mockWatchlists));

      const result = await service.listWatchlists('u1');
      expect(result).toEqual(mockWatchlists);
    });
  });

  describe('createWatchlist', () => {
    it('should create and return a watchlist', async () => {
      const created = { id: 'w1', name: 'Tech', userId: 'u1' };
      mockDb.insert.mockReturnValue(mockQueryChain([created]));

      const result = await service.createWatchlist('u1', { name: 'Tech' });
      expect(result).toEqual(created);
    });
  });

  describe('deleteWatchlist', () => {
    it('should delete an owned watchlist', async () => {
      mockDb.select.mockReturnValueOnce(
        mockQueryChain([{ id: 'w1', userId: 'u1' }]),
      );
      mockDb.delete.mockReturnValue(mockQueryChain([]));

      await expect(
        service.deleteWatchlist('u1', 'w1'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException for unowned watchlist', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));

      await expect(service.deleteWatchlist('u1', 'w1')).rejects.toThrow(
        'Watchlist not found',
      );
    });
  });

  describe('getItems', () => {
    it('should return items for an owned watchlist', async () => {
      mockDb.select
        .mockReturnValueOnce(mockQueryChain([{ id: 'w1', userId: 'u1' }])) // ownership
        .mockReturnValueOnce(mockQueryChain([{ id: 'i1', ticker: 'AAPL' }])); // items

      const result = await service.getItems('w1', 'u1');
      expect(result).toEqual([{ id: 'i1', ticker: 'AAPL' }]);
    });

    it('should throw NotFoundException for unowned watchlist', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));

      await expect(service.getItems('w1', 'u1')).rejects.toThrow(
        'Watchlist not found',
      );
    });
  });

  describe('addItem', () => {
    it('should add an item to an owned watchlist', async () => {
      mockDb.select
        .mockReturnValueOnce(mockQueryChain([{ id: 'w1', userId: 'u1' }])) // ownership check in addItem
        .mockReturnValueOnce(mockQueryChain([{ id: 'w1', userId: 'u1' }])) // ownership check in getItems
        .mockReturnValueOnce(mockQueryChain([])); // items query in getItems
      symbolsService.lookupOrCreate.mockResolvedValue({
        id: 's1',
        symbolKey: 'X:AAPL',
      });
      mockDb.insert.mockReturnValue(
        mockQueryChain([{ id: 'i1', symbolId: 's1' }]),
      );

      const result = await service.addItem('u1', 'w1', { ticker: 'AAPL' });
      expect(result).toEqual({ id: 'i1', symbolId: 's1' });
      expect(symbolsService.lookupOrCreate).toHaveBeenCalledWith(
        'AAPL',
        undefined,
      );
    });

    it('should throw NotFoundException for unowned watchlist', async () => {
      mockDb.select.mockReturnValue(mockQueryChain([]));

      await expect(
        service.addItem('u1', 'w1', { ticker: 'AAPL' }),
      ).rejects.toThrow('Watchlist not found');
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      mockDb.select.mockReturnValueOnce(
        mockQueryChain([{ id: 'w1', userId: 'u1' }]),
      );
      mockDb.update.mockReturnValue(
        mockQueryChain([{ id: 'i1', notes: 'new note' }]),
      );

      const result = await service.updateItem('u1', 'w1', 'i1', {
        notes: 'new note',
      });
      expect(result).toEqual({ id: 'i1', notes: 'new note' });
    });
  });

  describe('deleteItem', () => {
    it('should delete an item from an owned watchlist', async () => {
      mockDb.select.mockReturnValueOnce(
        mockQueryChain([{ id: 'w1', userId: 'u1' }]),
      );
      mockDb.delete.mockReturnValue(mockQueryChain([]));

      await expect(
        service.deleteItem('u1', 'w1', 'i1'),
      ).resolves.toBeUndefined();
    });
  });
});
