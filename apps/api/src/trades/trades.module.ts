import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';

@Module({
  controllers: [TradesController],
  providers: [TradesService, BehavioralService],
  exports: [TradesService, BehavioralService],
})
export class TradesModule {}
