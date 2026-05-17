import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [TradesController],
  providers: [TradesService, BehavioralService, EventPublisherService],
  exports: [TradesService, BehavioralService],
})
export class TradesModule {}
