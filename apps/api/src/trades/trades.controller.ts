import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { SnapshotService } from '../analytics/snapshot.service';
import { JobStatusService } from '../queues/job-status.service';
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from './dto';
import type { Express, Response } from 'express';

interface ImportJobResponse {
  jobId: string;
  message: string;
}

@ApiTags('trades')
@ApiBearerAuth()
@Controller('trades')
export class TradesController {
  constructor(
    private readonly service: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly snapshotService: SnapshotService,
    @InjectQueue('csv-import') private csvQueue: Queue,
    private readonly jobStatusService: JobStatusService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trade' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTradeDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List trades with filtering and pagination' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryTradesDto) {
    return this.service.findAll(userId, query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get trade analytics and statistics' })
  getAnalytics(@CurrentUser('id') userId: string) {
    return this.service.getAnalytics(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get all dashboard data for Phase 2 widgets' })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.service.getDashboardData(userId);
  }

  @Get('analytics/advanced')
  @ApiOperation({
    summary: 'Get advanced analytics with Sharpe, Sortino, Calmar ratios',
  })
  getAdvancedAnalytics(@CurrentUser('id') userId: string) {
    return this.service.getAdvancedAnalytics(userId);
  }

  @Get('analytics/behavioral')
  @ApiOperation({
    summary: 'Get behavioral analytics: FOMO, revenge trading, time patterns',
  })
  getBehavioralAnalytics(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.behavioralService.analyzeBehavior(
      userId,
      days ? parseInt(days) : 90,
    );
  }

  @Get('analytics/strategy')
  @ApiOperation({ summary: 'Get strategy performance analytics' })
  getStrategyAnalytics(@CurrentUser('id') userId: string) {
    return this.service.getStrategyAnalytics(userId);
  }

  @Get('analytics/tags')
  @ApiOperation({ summary: 'Get tag performance analytics' })
  getTagAnalytics(@CurrentUser('id') userId: string) {
    return this.service.getTagAnalytics(userId);
  }

  @Get('analytics/compare')
  @ApiOperation({ summary: 'Compare two strategies head-to-head' })
  compareStrategies(
    @CurrentUser('id') userId: string,
    @Query('strategyA') strategyA: string,
    @Query('strategyB') strategyB: string,
  ) {
    return this.service.compareStrategies(userId, strategyA, strategyB);
  }

  @UseGuards(JwtAuthGuard)
  @Post('analytics/snapshot')
  @ApiOperation({ summary: 'Create an analytics snapshot' })
  async createSnapshot(@CurrentUser('id') userId: string) {
    await this.snapshotService.createSnapshot(userId);
    return { message: 'Snapshot created' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics/snapshot')
  @ApiOperation({ summary: 'Get an analytics snapshot by date' })
  async getSnapshot(
    @CurrentUser('id') userId: string,
    @Query('date') date: string,
  ) {
    return this.snapshotService.getSnapshot(userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics/snapshot/history')
  @ApiOperation({ summary: 'Get analytics snapshot history' })
  async getSnapshotHistory(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.snapshotService.getSnapshotHistory(
      userId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('daily-pnl')
  @ApiOperation({ summary: 'Get daily PnL breakdown' })
  getDailyPnl(
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getDailyPnl(userId, from, to);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export all trades as CSV (streamed in chunks)' })
  async exportCsv(@CurrentUser('id') userId: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"');
    await this.service.streamExportCsv(userId, res);
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Import trades from CSV file (async)' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV files are allowed'), false);
        }
      },
    }),
  )
  async importCsv(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportJobResponse> {
    if (!file) throw new BadRequestException('No CSV file provided');
    const csvContent = file.buffer.toString('utf-8');
    const job = await this.csvQueue.add(
      'import',
      {
        userId,
        csvContent,
        fileName: file.originalname,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    );

    return {
      jobId: job.id!,
      message: 'CSV import started. Poll status with job ID.',
    };
  }

  @Get('import/jobs/:jobId')
  @ApiOperation({ summary: 'Get CSV import job status' })
  async getImportJobStatus(@Param('jobId') jobId: string) {
    return this.jobStatusService.getJobStatus('csv-import', jobId);
  }

  @Get('import/jobs')
  @ApiOperation({ summary: 'Get CSV import job history' })
  async getImportJobHistory(@Query('limit') limit?: string) {
    return this.jobStatusService.getJobHistory(
      'csv-import',
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single trade by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a trade' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTradeDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trade' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload a chart image for a trade' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadImage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No image file provided');
    return this.service.uploadImage(userId, id, file.filename);
  }
}
