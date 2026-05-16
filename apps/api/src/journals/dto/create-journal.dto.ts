import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalDto {
  @ApiPropertyOptional()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pre_market_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  post_market_notes?: string;

  @ApiPropertyOptional({
    enum: ['great', 'good', 'neutral', 'bad', 'terrible'],
  })
  @IsOptional()
  @IsEnum(['great', 'good', 'neutral', 'bad', 'terrible'])
  mood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  market_conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessons?: string;
}
