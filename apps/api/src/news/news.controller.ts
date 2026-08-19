import { Controller, Get } from '@nestjs/common';
import { NewsService, MarketNewsEvent } from './news.service';

@Controller()
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('news')
  async getWeeklyNews(): Promise<MarketNewsEvent[]> {
    return this.newsService.getWeeklyNews();
  }
}
