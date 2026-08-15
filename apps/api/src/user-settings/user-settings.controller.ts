import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ValidateApiKeyDto } from './dto/validate-api-key.dto';

const VALIDATION_ENDPOINTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1/models',
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/models',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
  mistral: 'https://api.mistral.ai/v1/models',
  groq: 'https://api.groq.com/openai/v1/models',
  together: 'https://api.together.xyz/v1/models',
  perplexity: 'https://api.perplexity.ai/models',
  fireworks: 'https://api.fireworks.ai/inference/v1/models',
  deepseek: 'https://api.deepseek.com/v1/models',
  xai: 'https://api.x.ai/v1/models',
};

// Providers that use x-api-key header instead of Authorization: Bearer
const API_KEY_HEADER_PROVIDERS = new Set(['anthropic']);

@ApiTags('user-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly service: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings' })
  get(@CurrentUser('id') userId: string) {
    return this.service.get(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user settings (merged)' })
  update(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.service.update(userId, dto);
  }

  // --- API Key endpoints ---

  @Get('api-key/status')
  @ApiOperation({ summary: 'Get API key connection status' })
  getApiKeyStatus(@CurrentUser('id') userId: string) {
    return this.service.getApiKeyStatus(userId);
  }

  @Post('api-key/validate')
  @ApiOperation({ summary: 'Validate an API key (test only, does not save)' })
  async validateApiKey(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateApiKeyDto,
  ) {
    const { modelCount } = await this.validateProviderKey(dto);
    return { valid: true, modelCount };
  }

  @Patch('api-key')
  @ApiOperation({
    summary: 'Save API key (validates first, then encrypts and stores)',
  })
  async setApiKey(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateApiKeyDto,
  ) {
    // Validate first
    const { modelCount } = await this.validateProviderKey(dto);

    // Encrypt and store
    const status = await this.service.setApiKey(
      userId,
      dto.apiKey,
      dto.provider,
      true,
      undefined,
      dto.baseUrl,
    );
    return { ...status, modelCount };
  }

  private async validateProviderKey(dto: ValidateApiKeyDto) {
    let endpoint: string;
    if (dto.provider === 'custom') {
      if (!dto.baseUrl) {
        throw new HttpException(
          'baseUrl is required for custom providers',
          HttpStatus.BAD_REQUEST,
        );
      }
      endpoint = `${dto.baseUrl}/models`;
    } else {
      endpoint = VALIDATION_ENDPOINTS[dto.provider];
      if (!endpoint) {
        throw new HttpException(
          `Unsupported provider: ${dto.provider}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const headers: Record<string, string> = {};
    if (API_KEY_HEADER_PROVIDERS.has(dto.provider)) {
      headers['x-api-key'] = dto.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${dto.apiKey}`;
    }
    return this.checkProviderEndpoint(endpoint, headers);
  }

  private async checkProviderEndpoint(
    endpoint: string,
    headers: Record<string, string>,
  ) {
    try {
      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new HttpException('Invalid API key', HttpStatus.BAD_REQUEST);
      }
      const data = (await res.json()) as { data?: unknown[] };
      return { modelCount: data.data?.length ?? 0 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to validate API key',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Delete('api-key')
  @ApiOperation({ summary: 'Remove API key' })
  deleteApiKey(@CurrentUser('id') userId: string) {
    return this.service.deleteApiKey(userId);
  }
}
