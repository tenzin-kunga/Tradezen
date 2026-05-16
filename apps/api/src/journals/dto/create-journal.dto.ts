import { IsOptional, IsString, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum JournalMood {
  GREAT = 'great',
  GOOD = 'good',
  NEUTRAL = 'neutral',
  BAD = 'bad',
  TERRIBLE = 'terrible',
}

export class CreateJournalDto {
  @ApiPropertyOptional()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  pre_market_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  post_market_notes?: string;

  @ApiPropertyOptional({
    enum: JournalMood,
  })
  @IsOptional()
  @IsEnum(JournalMood)
  mood?: JournalMood;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  market_conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lessons?: string;
}
