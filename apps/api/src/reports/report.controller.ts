import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('weekly')
  async getWeeklyReport(@CurrentUser('id') userId: string) {
    return this.reportService.generateWeeklyReport(userId);
  }

  @Get('export/csv')
  async exportCSV(@CurrentUser('id') userId: string, @Res() res: Response) {
    const csv = await this.reportService.generateCSV(userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trades.csv');
    res.send(csv);
  }
}
