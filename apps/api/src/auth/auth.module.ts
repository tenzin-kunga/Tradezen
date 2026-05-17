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
    GoogleStrategy,
    GithubStrategy,
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
export class AuthModule {}
