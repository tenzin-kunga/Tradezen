import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import { KnowledgeRetrievalService } from './retrieval.service';

@ApiTags('retrieval')
@ApiBearerAuth()
@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: KnowledgeRetrievalService) {}

  @Get('context/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get full context for a resource' })
  async getContext(
    @CurrentUser('id') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('profile') profile: string = 'inspector',
  ) {
    return this.retrievalService.getDocumentContext(
      resourceId,
      userId,
      profile,
    );
  }

  @Get('related/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Find related resources with evidence' })
  async getRelated(
    @CurrentUser('id') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('profile') profile: string = 'inspector',
  ) {
    return this.retrievalService.findRelated(
      resourceType,
      resourceId,
      profile,
      userId,
    );
  }

  @Get('search/semantic')
  @ApiOperation({ summary: 'Semantic search across all knowledge' })
  async semanticSearch(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
    @Query('profile') profile: string = 'fast',
  ) {
    return this.retrievalService.semanticSearch(userId, query || '', profile);
  }
}
