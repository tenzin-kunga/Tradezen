import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthService } from './oauth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly oauthService: OAuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const user = await this.oauthService.validateOAuthUser({
        provider: 'google',
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        displayName: profile.displayName,
        username: profile.emails?.[0]?.value?.split('@')[0],
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
