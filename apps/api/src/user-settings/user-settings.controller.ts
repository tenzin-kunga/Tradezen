import { Controller, Get, Patch, Delete, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
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
};

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
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateUserSettingsDto) {
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
  async validateApiKey(@CurrentUser('id') userId: string, @Body() dto: ValidateApiKeyDto) {
    const endpoint = VALIDATION_ENDPOINTS[dto.provider];
    if (!endpoint) {
      throw new HttpException(`Unsupported provider: ${dto.provider}`, HttpStatus.BAD_REQUEST);
    }

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${dto.apiKey}` };
      // Anthropic uses x-api-key header instead
      if (dto.provider === 'anthropic') {
        headers['x-api-key'] = dto.apiKey;
        delete headers['Authorization'];
      }

      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new HttpException('Invalid API key', HttpStatus.BAD_REQUEST);
      }
      const data = await res.json() as { data?: unknown[] };
      return { valid: true, modelCount: data.data?.length ?? 0 };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Failed to validate API key', HttpStatus.BAD_GATEWAY);
    }
  }

  @Patch('api-key')
  @ApiOperation({ summary: 'Save API key (validates first, then encrypts and stores)' })
  async setApiKey(@CurrentUser('id') userId: string, @Body() dto: ValidateApiKeyDto) {
    const endpoint = VALIDATION_ENDPOINTS[dto.provider];
    if (!endpoint) {
      throw new HttpException(`Unsupported provider: ${dto.provider}`, HttpStatus.BAD_REQUEST);
    }

    // Validate first
    let modelCount = 0;
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${dto.apiKey}` };
      if (dto.provider === 'anthropic') {
        headers['x-api-key'] = dto.apiKey;
        delete headers['Authorization'];
      }

      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new HttpException('Invalid API key', HttpStatus.BAD_REQUEST);
      }
      const data = await res.json() as { data?: unknown[] };
      modelCount = data.data?.length ?? 0;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Failed to validate API key', HttpStatus.BAD_GATEWAY);
    }

    // Encrypt and store
    const status = await this.service.setApiKey(userId, dto.apiKey, dto.provider, true);
    return { ...status, modelCount };
  }

  @Delete('api-key')
  @ApiOperation({ summary: 'Remove API key' })
  deleteApiKey(@CurrentUser('id') userId: string) {
    return this.service.deleteApiKey(userId);
  }
}
