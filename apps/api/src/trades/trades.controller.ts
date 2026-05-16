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
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TradesService } from './trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { SnapshotService } from '../analytics/snapshot.service';
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Express, Response } from 'express';

interface ImportResult {
  imported: number;
  errors: string[];
}

@ApiTags('trades')
@ApiBearerAuth()
@Controller('trades')
export class TradesController {
  constructor(
    private readonly service: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly snapshotService: SnapshotService,
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

  @Get('analytics/advanced')
  @ApiOperation({ summary: 'Get advanced analytics with Sharpe, Sortino, Calmar ratios' })
  getAdvancedAnalytics(@CurrentUser('id') userId: string) {
    return this.service.getAdvancedAnalytics(userId);
  }

  @Get('analytics/behavioral')
  @ApiOperation({ summary: 'Get behavioral analytics: FOMO, revenge trading, time patterns' })
  getBehavioralAnalytics(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.behavioralService.analyzeBehavior(userId, days ? parseInt(days) : 90);
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

  @Post('analytics/snapshot')
  @ApiOperation({ summary: 'Create an analytics snapshot' })
  async createSnapshot(@Body('userId') userId: string) {
    await this.snapshotService.createSnapshot(userId);
    return { message: 'Snapshot created' };
  }

  @Get('analytics/snapshot')
  @ApiOperation({ summary: 'Get an analytics snapshot by date' })
  async getSnapshot(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.snapshotService.getSnapshot(userId, date);
  }

  @Get('analytics/snapshot/history')
  @ApiOperation({ summary: 'Get analytics snapshot history' })
  async getSnapshotHistory(
    @Query('userId') userId: string,
    @Query('days') days?: string,
  ) {
    return this.snapshotService.getSnapshotHistory(userId, days ? parseInt(days) : 30);
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
  @ApiOperation({ summary: 'Import trades from CSV file' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) throw new BadRequestException('No CSV file provided');
    return this.service.importCsv(userId, file.buffer.toString('utf-8'));
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
