import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { researchStatus, researchConviction } from '@tradezen/db';

export class CreateProjectDto {
  @ApiProperty({ example: 'AAPL Long Thesis' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Existing symbol id' })
  @IsOptional()
  @IsUUID()
  symbol_id?: string;

  @ApiPropertyOptional({ enum: researchStatus })
  @IsOptional()
  @IsIn(researchStatus)
  status?: string;

  @ApiPropertyOptional({ enum: researchConviction })
  @IsOptional()
  @IsIn(researchConviction)
  conviction?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ enum: researchStatus })
  @IsOptional()
  @IsIn(researchStatus)
  status?: string;

  @ApiPropertyOptional({ enum: researchConviction })
  @IsOptional()
  @IsIn(researchConviction)
  conviction?: string;

  @ApiPropertyOptional({ description: 'Existing symbol id or null to detach' })
  @IsOptional()
  @IsUUID()
  symbol_id?: string | null;
}

export class UpdateNotesDto {
  @ApiProperty({ example: 'Bullish due to...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Last known version for optimistic locking',
  })
  @IsOptional()
  @IsInt()
  base_version?: number;
}

export class UpdateChecklistDto {
  @ApiPropertyOptional()
  @IsOptional()
  thesis_complete?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  valuation_complete?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  risks_reviewed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  earnings_reviewed?: boolean;
}

export class CreateTagDto {
  @ApiProperty({ example: 'catalyst' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
