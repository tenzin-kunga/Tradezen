import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { SnapshotService } from '../analytics/snapshot.service';
import { JobStatusService } from '../queues/job-status.service';
import { NotificationTriggersService } from '../common/services/notification-triggers.service';
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
  },
}));

describe('TradesController', () => {
  let controller: TradesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [
        {
          provide: 'BullQueue_csv-import',
          useValue: { add: jest.fn(), getJob: jest.fn() },
        },
        {
          provide: 'BullQueue_ai-processing',
          useValue: { add: jest.fn(), getJob: jest.fn() },
        },
        { provide: EventPublisherService, useValue: { publish: jest.fn() } },
        { provide: SeedService, useValue: {} },
        { provide: TradeImageService, useValue: {} },
        TradesService,
        BehavioralService,
        SnapshotService,
        JobStatusService,
        {
          provide: NotificationTriggersService,
          useValue: { checkAndNotify: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<TradesController>(TradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
