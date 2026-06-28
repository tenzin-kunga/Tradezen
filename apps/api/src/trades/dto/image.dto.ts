import {
  IsArray,
  IsNumber,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderImageDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class ReorderImagesDto {
  @ApiProperty({ type: [ReorderImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderImageDto)
  images: ReorderImageDto[];
}

export class ImageResponseDto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  displayOrder: number;
  metadata: Record<string, unknown>;
}
