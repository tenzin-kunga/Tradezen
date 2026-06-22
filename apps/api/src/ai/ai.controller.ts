import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiInsightsService, InsightsResponse } from './ai-insights.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get('insights')
  @ApiOperation({ summary: 'Get rule-based trading insights (cached, 6h TTL)' })
  getInsights(@CurrentUser('id') userId: string): Promise<InsightsResponse> {
    return this.aiInsightsService.getInsights(userId);
  }
}
