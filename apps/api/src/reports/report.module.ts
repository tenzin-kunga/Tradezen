import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TradesModule } from '../trades/trades.module';
import { JournalsModule } from '../journals/journals.module';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { CoachingWorkflow } from '../ai/workflows/coaching.workflow';
import { SemanticModule } from '../ai/context/semantic/semantic.module';

@Module({
  imports: [TradesModule, JournalsModule, SemanticModule],
  controllers: [ReportController],
  providers: [ReportService, CoachingEngineService, CoachingWorkflow],
})
export class ReportModule {}
