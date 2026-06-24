import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { OAuthService } from '../oauth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly oauthService: OAuthService) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }
    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ??
        'http://localhost:3001/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const email =
      profile.emails?.[0]?.value ??
      `${profile.username}@users.noreply.github.com`;

    const user = await this.oauthService.validateOAuthUser({
      provider: 'github',
      providerId: profile.id.toString(),
      email,
      displayName: profile.displayName ?? profile.username,
      username: profile.username,
      avatar: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });
    return user;
  }
}
