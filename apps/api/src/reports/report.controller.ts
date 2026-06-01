import { Controller, Get, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly performance report' })
  async getWeeklyReport(@CurrentUser('id') userId: string) {
    return this.reportService.generateWeeklyReport(userId);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export weekly report as PDF' })
  async exportPDF(@CurrentUser('id') userId: string, @Res() res: Response) {
    const pdf = await this.reportService.generatePDF(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-report.pdf');
    res.send(pdf);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export trades as CSV' })
  async exportCSV(@CurrentUser('id') userId: string, @Res() res: Response) {
    const csv = await this.reportService.generateCSV(userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trades.csv');
    res.send(csv);
  }
}
