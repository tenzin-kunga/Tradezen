import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant'] })
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @ApiProperty({ example: 'How can I improve my risk management?' })
  @IsString()
  @MaxLength(4000)
  content: string;
}
