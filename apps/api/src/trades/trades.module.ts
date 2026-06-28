import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { TradeImageService } from './trades-image.service';
import { TradeImageController } from './trades-image.controller';
import { BehavioralService } from '../analytics/behavioral.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { QueuesModule } from '../queues/queues.module';
import { SeedModule } from '../seed/seed.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [QueuesModule, SeedModule, StorageModule],
  controllers: [TradesController, TradeImageController],
  providers: [TradesService, TradeImageService, BehavioralService, EventPublisherService],
  exports: [TradesService, TradeImageService, BehavioralService],
})
export class TradesModule {}
