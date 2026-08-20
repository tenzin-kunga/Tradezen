import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { OAuthService, type OAuthUserResponse } from '../oauth.service';

interface PassportProfile {
  id: string;
  displayName?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly oauthService: OAuthService) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: PassportProfile,
  ): Promise<OAuthUserResponse> {
    const user = await this.oauthService.validateOAuthUser({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value as string,
      displayName: profile.displayName as string,
      username: profile.emails?.[0]?.value?.split('@')[0] as string,
      avatar: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });
    return user;
  }
}
