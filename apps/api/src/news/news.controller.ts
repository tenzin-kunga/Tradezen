import { Controller, Get } from '@nestjs/common';
import { NewsService, MarketNewsEvent } from './news.service';
import { Public } from '../auth/public.decorator';

@Controller()
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Public()
  @Get('news')
  async getWeeklyNews(): Promise<MarketNewsEvent[]> {
    return this.newsService.getWeeklyNews();
  }
}
