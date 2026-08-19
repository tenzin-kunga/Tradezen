import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({
    example: {
      activeModels: ['qwen3:latest', 'anthropic/claude-sonnet-4'],
      defaultModel: 'qwen3:latest',
      temperature: 0.4,
      reasoningMode: 'auto',
    },
  })
  @IsOptional()
  assistantSettings?: {
    activeModels?: string[];
    defaultModel?: string;
    temperature?: number;
    reasoningMode?: 'auto' | 'on' | 'off';
  };

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  workspaceSettings?: Record<string, unknown>;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  notificationSettings?: Record<string, unknown>;
}
