import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('goals')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new goal' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all goals (with current progress)' })
  findAll(@CurrentUser('id') userId: string) {
    return this.goalsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a goal' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goalsService.remove(userId, id);
  }
}
