import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryTradesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['created_at', 'pnl', 'symbol'] })
  @IsOptional()
  @IsIn(['created_at', 'pnl', 'symbol'])
  sort?: string = 'created_at';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: string = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ enum: ['buy', 'sell'] })
  @IsOptional()
  @IsIn(['buy', 'sell'])
  direction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strategy?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  to?: string;
}
