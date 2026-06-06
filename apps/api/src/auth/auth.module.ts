import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { BruteForceService } from '../common/services/brute-force.service';
import { AuditService } from '../common/services/audit.service';
import { SuspiciousLoginService } from '../common/services/suspicious-login.service';
import { TwoFactorService } from './services/two-factor.service';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    BruteForceService,
    AuditService,
    SuspiciousLoginService,
    TwoFactorService,
    OAuthService,
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleStrategy]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GithubStrategy]
      : []),
  ],
  exports: [
    AuthService,
    BruteForceService,
    AuditService,
    SuspiciousLoginService,
    TwoFactorService,
    OAuthService,
  ],
})
export class AuthModule {
  constructor() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn(
        '[AuthModule] Google OAuth disabled (GOOGLE_CLIENT_ID/SECRET not set)',
      );
    }
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.warn(
        '[AuthModule] GitHub OAuth disabled (GITHUB_CLIENT_ID/SECRET not set)',
      );
    }
  }
}
