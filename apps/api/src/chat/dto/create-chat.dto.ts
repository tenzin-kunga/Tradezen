import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ChatMessageDto } from './chat-message.dto';

export class ContextRequestDto {
  @ApiPropertyOptional({
    description: 'Explicit provider ids',
    example: ['trades', 'analytics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  providers?: string[];

  @ApiPropertyOptional({
    description: 'Entity references (tickers, project ids)',
    example: ['NVDA'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entities?: string[];

  @ApiPropertyOptional({ description: 'Specific trade ids to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tradeIds?: string[];

  @ApiPropertyOptional({ description: 'Specific research project ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  researchIds?: string[];

  @ApiPropertyOptional({ description: 'Include portfolio snapshot' })
  @IsOptional()
  @IsBoolean()
  portfolio?: boolean;

  @ApiPropertyOptional({ description: 'Max items per provider', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CreateChatDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ example: 'openai/gpt-4o-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ example: 'You are a concise trading assistant.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Structured context request',
    type: ContextRequestDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContextRequestDto)
  contextRequest?: ContextRequestDto;

  @ApiPropertyOptional({
    description: 'Agent intent that scopes which tools the planner may use',
    example: 'review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  intent?: string;

  @ApiPropertyOptional({
    description: 'Chat thread id for conversation memory persistence',
  })
  @IsOptional()
  @IsString()
  threadId?: string;
}
