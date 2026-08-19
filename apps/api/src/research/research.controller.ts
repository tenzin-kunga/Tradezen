import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResearchService } from './research.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateNotesDto,
  UpdateChecklistDto,
  CreateTagDto,
} from './dto';

const ASSET_MAX_SIZE_MB = parseInt(process.env.ASSET_MAX_SIZE_MB || '25', 10);
const ALLOWED_ASSET_TYPES = (
  process.env.ALLOWED_ASSET_TYPES ||
  'application/pdf,image/,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
).split(',');

@ApiTags('research')
@ApiBearerAuth()
@Controller('research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get('projects')
  @ApiOperation({ summary: 'List research projects' })
  async listProjects(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.researchService.listProjects(userId, {
      status,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a research project' })
  async createProject(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.researchService.createProject(userId, dto);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a research project' })
  async getProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    return this.researchService.getProject(userId, projectId);
  }

  @Put('projects/:id')
  @ApiOperation({ summary: 'Update a research project' })
  async updateProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.researchService.updateProject(userId, projectId, dto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete a research project' })
  async deleteProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    await this.researchService.deleteProject(userId, projectId);
  }

  @Put('projects/:id/notes')
  @ApiOperation({ summary: 'Update research notes (optimistic locking)' })
  async updateNotes(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateNotesDto,
  ) {
    return this.researchService.updateNotes(userId, projectId, dto);
  }

  @Put('projects/:id/checklist')
  @ApiOperation({ summary: 'Update research checklist' })
  async updateChecklist(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.researchService.updateChecklist(userId, projectId, dto);
  }

  @Post('projects/:id/tags')
  @ApiOperation({ summary: 'Add a tag to a research project' })
  async addTag(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.researchService.addTag(userId, projectId, dto);
  }

  @Delete('projects/:id/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag' })
  async removeTag(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Param('tagId') tagId: string,
  ) {
    await this.researchService.removeTag(userId, projectId, tagId);
  }

  @Get('projects/:id/activity')
  @ApiOperation({ summary: 'Get project activity log' })
  async getActivity(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    return this.researchService.getActivity(userId, projectId);
  }

  @Post('projects/:id/ai-query')
  @ApiOperation({ summary: 'Log an AI query against a project' })
  async logAiQuery(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body('prompt') prompt: string,
  ) {
    await this.researchService.logAiQuery(userId, projectId, prompt ?? '');
    return { ok: true };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search research projects' })
  async search(@CurrentUser('id') userId: string, @Query('q') q?: string) {
    return this.researchService.search(userId, q ?? '');
  }

  // ─── Assets (documents) ───────────────────────

  @Post('projects/:id/assets')
  @ApiOperation({
    summary:
      'Upload a document to a research project (async deletion lifecycle)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ASSET_MAX_SIZE_MB * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ALLOWED_ASSET_TYPES.some((t) =>
          t.endsWith('/') ? file.mimetype.startsWith(t) : file.mimetype === t,
        );
        if (allowed) cb(null, true);
        else cb(new Error('Unsupported file type'), false);
      },
    }),
  )
  @HttpCode(201)
  async uploadAsset(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ) {
    if (!file) throw new Error('No file provided');
    return this.researchService.uploadAsset(
      userId,
      projectId,
      file,
      category || 'other',
    );
  }

  @Get('projects/:id/assets')
  @ApiOperation({ summary: 'List documents for a research project' })
  async listAssets(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    await this.researchService.getProject(userId, projectId);
    return this.researchService.listAssets(projectId);
  }

  @Delete('projects/:id/assets/:assetId')
  @ApiOperation({
    summary: 'Delete a document (enqueues async storage deletion)',
  })
  @HttpCode(202)
  async deleteAsset(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.researchService.deleteAsset(userId, projectId, assetId);
    return { ok: true, status: 'deleting' };
  }
}
