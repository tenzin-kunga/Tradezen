import { IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PROVIDERS = [
  'cloud',
  'openrouter',
  'openai',
  'anthropic',
  'google',
  'mistral',
  'groq',
  'together',
  'perplexity',
  'fireworks',
  'deepseek',
  'xai',
  'custom',
] as const;

export class ValidateApiKeyDto {
  @ApiProperty({ example: 'sk-or-v1-...' })
  @IsString()
  @MinLength(10)
  apiKey!: string;

  @ApiProperty({
    example: 'openrouter',
    enum: PROVIDERS,
  })
  @IsString()
  @IsIn(PROVIDERS)
  provider!: string;

  @ApiProperty({ example: 'https://api.groq.com/openai/v1', required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;
}
