import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TagCategory {
  SETUP = 'setup',
  CONDITION = 'condition',
  EMOTION = 'emotion',
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ default: '#888888' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #888888)',
  })
  color?: string;

  @ApiPropertyOptional({
    enum: TagCategory,
    default: TagCategory.SETUP,
  })
  @IsOptional()
  @IsEnum(TagCategory)
  category?: TagCategory;
}
