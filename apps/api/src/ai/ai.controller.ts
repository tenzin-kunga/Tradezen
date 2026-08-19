import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiInsightsService, InsightsResponse } from './ai-insights.service';
import {
  ReconciliationService,
  type ReconciliationReport,
} from './reconciliation.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiInsightsService: AiInsightsService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get('insights')
  @ApiOperation({ summary: 'Get rule-based trading insights (cached, 6h TTL)' })
  getInsights(@CurrentUser('id') userId: string): Promise<InsightsResponse> {
    return this.aiInsightsService.getInsights(userId);
  }

  @Get('reconciliation')
  @ApiOperation({
    summary: 'Run corpus reconciliation (missing/stale/orphaned/duplicate)',
  })
  reconciliation(): Promise<ReconciliationReport[]> {
    return this.reconciliationService.run();
  }
}
