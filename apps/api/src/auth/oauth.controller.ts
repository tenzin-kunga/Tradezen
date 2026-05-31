import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { Public } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@ApiTags('oauth')
@Controller('auth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;
    const tokens = this.oauthService.setOAuthTokens(res, user);

    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(`${webUrl}/auth/callback?token=${tokens.access_token}`);
  }

  @Public()
  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  @UseGuards(AuthGuard('github'))
  githubLogin() {}

  @Public()
  @Get('github/callback')
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;
    const tokens = this.oauthService.setOAuthTokens(res, user);

    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(`${webUrl}/auth/callback?token=${tokens.access_token}`);
  }

  @Post('oauth/link')
  @ApiOperation({ summary: 'Link OAuth account to current user' })
  @UseGuards(JwtAuthGuard)
  async linkAccount(@CurrentUser('id') userId: string, @Req() req: Request) {
    const profile = req.user as any;
    await this.oauthService.linkAccount(userId, profile);
    return { message: 'Account linked successfully' };
  }

  @Post('oauth/unlink')
  @ApiOperation({ summary: 'Unlink OAuth account from current user' })
  @UseGuards(JwtAuthGuard)
  async unlinkAccount(@CurrentUser('id') userId: string, @Req() req: Request) {
    const { provider } = req.body;
    await this.oauthService.unlinkAccount(userId, provider);
    return { message: 'Account unlinked successfully' };
  }

  @Get('oauth/accounts')
  @ApiOperation({ summary: 'Get linked OAuth accounts for current user' })
  @UseGuards(JwtAuthGuard)
  async getLinkedAccounts(@CurrentUser('id') userId: string) {
    return this.oauthService.getLinkedAccounts(userId);
  }
}
