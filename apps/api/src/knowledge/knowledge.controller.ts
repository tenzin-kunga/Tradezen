import {
  BadRequestException,
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
import { KnowledgeService } from './knowledge.service';

const ASSET_MAX_SIZE_MB = parseInt(process.env.ASSET_MAX_SIZE_MB || '25', 10);
const ALLOWED_ASSET_TYPES = (
  process.env.ALLOWED_ASSET_TYPES ||
  'application/pdf,image/,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
).split(',');
import {
  CreateFolderDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateLinkDto,
} from './dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ─── Folders ─────────────────────────────────

  @Get('folders')
  @ApiOperation({ summary: 'List folders' })
  async listFolders(
    @CurrentUser('id') userId: string,
    @Query('parent_id') parentId?: string,
  ) {
    return this.knowledgeService.listFolders(userId, parentId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a folder' })
  async createFolder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.knowledgeService.createFolder(userId, dto);
  }

  @Put('folders/:id')
  @ApiOperation({ summary: 'Update a folder' })
  async updateFolder(
    @CurrentUser('id') userId: string,
    @Param('id') folderId: string,
    @Body() data: { name?: string; icon?: string; parent_id?: string },
  ) {
    return this.knowledgeService.updateFolder(userId, folderId, data);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  async deleteFolder(
    @CurrentUser('id') userId: string,
    @Param('id') folderId: string,
  ) {
    return this.knowledgeService.deleteFolder(userId, folderId);
  }

  // ─── Documents ────────────────────────────────

  @Get('documents')
  @ApiOperation({ summary: 'List documents' })
  async listDocuments(
    @CurrentUser('id') userId: string,
    @Query('folder_id') folderId?: string,
  ) {
    return this.knowledgeService.listDocuments(userId, folderId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create a document' })
  async createDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.knowledgeService.createDocument(userId, dto);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get a document' })
  async getDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.knowledgeService.getDocument(userId, documentId);
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update a document' })
  async updateDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.knowledgeService.updateDocument(userId, documentId, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.knowledgeService.deleteDocument(userId, documentId);
  }

  // ─── Versions ─────────────────────────────────

  @Get('documents/:id/versions')
  @ApiOperation({ summary: 'List document versions' })
  async listVersions(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.knowledgeService.listVersions(userId, documentId);
  }

  // ─── Assets ───────────────────────────────────

  @Get('documents/:id/assets')
  @ApiOperation({ summary: 'List document assets' })
  async listAssets(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.knowledgeService.listAssets(userId, documentId);
  }

  @Post('documents/:id/assets')
  @ApiOperation({ summary: 'Upload an asset to a knowledge document' })
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
    @Param('id') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.knowledgeService.uploadAsset(
      userId,
      documentId,
      file,
      category || 'file',
    );
  }

  @Delete('assets/:id')
  @ApiOperation({ summary: 'Delete an asset' })
  async deleteAsset(
    @CurrentUser('id') userId: string,
    @Param('id') assetId: string,
  ) {
    return this.knowledgeService.deleteAsset(userId, assetId);
  }

  // ─── Links ────────────────────────────────────

  @Get('documents/:id/links')
  @ApiOperation({ summary: 'List document links' })
  async listLinks(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.knowledgeService.listLinks(userId, documentId);
  }

  @Post('documents/:id/links')
  @ApiOperation({ summary: 'Create a document link' })
  async createLink(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
    @Body() dto: CreateLinkDto,
  ) {
    return this.knowledgeService.createLink(userId, documentId, dto);
  }

  @Delete('links/:id')
  @ApiOperation({ summary: 'Delete a link' })
  async deleteLink(
    @CurrentUser('id') userId: string,
    @Param('id') linkId: string,
  ) {
    return this.knowledgeService.deleteLink(userId, linkId);
  }

  // ─── Search ───────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge documents' })
  async search(@CurrentUser('id') userId: string, @Query('q') query: string) {
    return this.knowledgeService.search(userId, query || '');
  }
}
