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
import { TagsService } from './tags.service';
import { CreateTagDto, QueryTagTradesDto, UpdateTagDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTagDto) {
    return this.tagsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags (with trade counts)' })
  findAll(@CurrentUser('id') userId: string) {
    return this.tagsService.findAll(userId);
  }

  @Get('trade/:tradeId')
  @ApiOperation({ summary: 'Get all tags for a trade' })
  getTagsForTrade(
    @CurrentUser('id') userId: string,
    @Param('tradeId') tradeId: string,
  ) {
    return this.tagsService.getTagsForTrade(userId, tradeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tagsService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tag' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tagsService.remove(userId, id);
  }

  @Post(':tagId/trades/:tradeId')
  @ApiOperation({ summary: 'Tag a trade' })
  addTagToTrade(
    @CurrentUser('id') userId: string,
    @Param('tagId') tagId: string,
    @Param('tradeId') tradeId: string,
  ) {
    return this.tagsService.addTagToTrade(userId, tradeId, tagId);
  }

  @Delete(':tagId/trades/:tradeId')
  @ApiOperation({ summary: 'Remove a tag from a trade' })
  removeTagFromTrade(
    @CurrentUser('id') userId: string,
    @Param('tagId') tagId: string,
    @Param('tradeId') tradeId: string,
  ) {
    return this.tagsService.removeTagFromTrade(userId, tradeId, tagId);
  }

  @Get(':id/trades')
  @ApiOperation({ summary: 'Get trades for a tag (paginated)' })
  getTradesForTag(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query() query: QueryTagTradesDto,
  ) {
    return this.tagsService.getTradesForTag(
      userId,
      id,
      query.limit ?? 50,
      query.offset ?? 0,
    );
  }
}
