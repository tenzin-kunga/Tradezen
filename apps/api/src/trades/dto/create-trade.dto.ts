import {
  IsString,
  IsIn,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsPositive,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTradeDto {
  @ApiProperty({ example: 'EURUSD' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  symbol: string;

  @ApiProperty({ enum: ['buy', 'sell'] })
  @IsIn(['buy', 'sell'])
  direction: 'buy' | 'sell';

  @ApiProperty({ example: 1.085 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  entry: number;

  @ApiProperty({ example: 1.092 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  exit: number;

  @ApiProperty({ example: 1.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  lot: number;

  @ApiPropertyOptional({ example: 1.08 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  stop_loss?: number | null;

  @ApiPropertyOptional({ example: 1.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  take_profit?: number | null;

  @ApiPropertyOptional({ example: 'breakout' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  strategy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  fomo_check?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trend_alignment?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  vengeance_trade?: boolean;

  @ApiPropertyOptional({
    example: 100000,
    description:
      'Contract size multiplier (100000 for standard forex lot, 1 for stocks)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000000)
  contract_size?: number;

  @ApiPropertyOptional({ example: '2025-01-15T10:30:00Z' })
  @IsOptional()
  @IsString()
  trade_date?: string | null;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  commission?: number | null;
}
