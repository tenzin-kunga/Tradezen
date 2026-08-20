import { Test, TestingModule } from '@nestjs/testing';
import { TradesService } from './trades.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { SeedService } from '../seed/seed.service';
import { TradeImageService } from './trades-image.service';

jest.mock('../db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({ offset: () => Promise.resolve([]) }),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({ returning: () => Promise.resolve([]) }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    execute: () => Promise.resolve([]),
    transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        insert: () => ({ values: () => ({}) }),
      }),
  },
}));

describe('TradesService', () => {
  let service: TradesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
        { provide: SeedService, useValue: {} },
        { provide: TradeImageService, useValue: {} },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
