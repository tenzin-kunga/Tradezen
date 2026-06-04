import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto, QueryJournalsDto, UpdateJournalDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('journals')
@ApiBearerAuth()
@Controller('journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create or upsert journal entry for a date' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateJournalDto) {
    return this.journalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all journal entries' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryJournalsDto) {
    return this.journalsService.findAll(
      userId,
      query.limit ?? 30,
      query.offset ?? 0,
    );
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get journaling streak info' })
  getStreak(@CurrentUser('id') userId: string) {
    return this.journalsService.getStreak(userId);
  }

  @Get('date/:date')
  @ApiOperation({ summary: 'Get journal entry by date (YYYY-MM-DD)' })
  findByDate(@CurrentUser('id') userId: string, @Param('date') date: string) {
    return this.journalsService.findByDate(userId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.journalsService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update journal entry' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
  ) {
    return this.journalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete journal entry' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.journalsService.remove(userId, id);
  }
}
