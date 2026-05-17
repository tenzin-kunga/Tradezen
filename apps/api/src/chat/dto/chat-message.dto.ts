import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class ChatMessageDto {
  @ApiProperty({ enum: ChatRole })
  @IsIn([ChatRole.SYSTEM, ChatRole.USER, ChatRole.ASSISTANT])
  role: ChatRole;

  @ApiProperty({ example: 'How can I improve my risk management?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  context?: string;
}
