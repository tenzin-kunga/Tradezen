import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-github2';
import { OAuthService } from './oauth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly oauthService: OAuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
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
    done: VerifyCallback,
  ): Promise<any> {
    try {
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
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
