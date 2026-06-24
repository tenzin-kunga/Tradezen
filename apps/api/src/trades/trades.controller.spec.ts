import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { SnapshotService } from '../analytics/snapshot.service';
import { JobStatusService } from '../queues/job-status.service';
import { EventPublisherService } from '../common/services/event-publisher.service';

jest.mock('../db/drizzle', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([]) }) }) }) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
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
        { provide: 'BullQueue_csv-import', useValue: { add: jest.fn(), getJob: jest.fn() } },
        { provide: 'BullQueue_ai-processing', useValue: { add: jest.fn(), getJob: jest.fn() } },
        { provide: EventPublisherService, useValue: { publish: jest.fn() } },
        TradesService,
        BehavioralService,
        SnapshotService,
        JobStatusService,
      ],
    }).compile();

    controller = module.get<TradesController>(TradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});