import { IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateApiKeyDto {
  @ApiProperty({ example: 'sk-or-v1-...' })
  @IsString()
  @MinLength(10)
  apiKey!: string;

  @ApiProperty({ example: 'openrouter', enum: ['openrouter', 'openai', 'anthropic'] })
  @IsString()
  @IsIn(['openrouter', 'openai', 'anthropic'])
  provider!: string;
}
