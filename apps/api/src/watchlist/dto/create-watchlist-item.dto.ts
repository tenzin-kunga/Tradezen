import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWatchlistItemDto {
  @ApiProperty({ example: 'BEL' })
  @IsString()
  @MaxLength(20)
  ticker: string;

  @ApiPropertyOptional({ example: 'NSE' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  exchange?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateWatchlistItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  alerts?: Record<string, unknown>;
}
