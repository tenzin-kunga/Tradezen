import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSymbolDto {
  @ApiProperty({ example: 'BEL' })
  @IsString()
  @MaxLength(20)
  ticker: string;

  @ApiPropertyOptional({ example: 'NSE' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  exchange?: string;

  @ApiPropertyOptional({ example: 'stock' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  asset_type?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'Bharat Electronics Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
