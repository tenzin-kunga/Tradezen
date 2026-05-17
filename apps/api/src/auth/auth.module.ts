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

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    BruteForceService,
    AuditService,
    SuspiciousLoginService,
    TwoFactorService,
  ],
  exports: [
    AuthService,
    BruteForceService,
    AuditService,
    SuspiciousLoginService,
    TwoFactorService,
  ],
})
export class AuthModule {}
