import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TradesModule } from '../trades/trades.module';
import { JournalsModule } from '../journals/journals.module';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { CoachingWorkflow } from '../ai/workflows/coaching.workflow';
import { EmbeddingService } from '../ai/embedding.service';

@Module({
  imports: [TradesModule, JournalsModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    CoachingEngineService,
    CoachingWorkflow,
    EmbeddingService,
  ],
})
export class ReportModule {}
