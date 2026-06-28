import {
  Controller,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { TradeImageService } from './trades-image.service';
import { ReorderImagesDto } from './dto/image.dto';

@ApiTags('trade-images')
@ApiBearerAuth()
@Controller('trades/:tradeId/images')
export class TradeImageController {
  constructor(private readonly imageService: TradeImageService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an image to a trade' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed'), false);
        }
      },
    }),
  )
  upload(
    @CurrentUser('id') userId: string,
    @Param('tradeId') tradeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.imageService.uploadImage(userId, tradeId, file);
  }

  @Put(':imageId')
  @ApiOperation({ summary: 'Replace an image' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed'), false);
        }
      },
    }),
  )
  replace(
    @CurrentUser('id') userId: string,
    @Param('tradeId') tradeId: string,
    @Param('imageId') imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.imageService.replaceImage(userId, tradeId, imageId, file);
  }

  @Delete(':imageId')
  @ApiOperation({ summary: 'Delete an image' })
  delete(
    @CurrentUser('id') userId: string,
    @Param('tradeId') tradeId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.imageService.deleteImage(userId, tradeId, imageId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder images' })
  reorder(
    @CurrentUser('id') userId: string,
    @Param('tradeId') tradeId: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.imageService.reorderImages(userId, tradeId, dto.images);
  }
}
