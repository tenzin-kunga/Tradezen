import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq, or, and, ne } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { users } from '@tradezen/db';
import { RegisterDto, LoginDto, SaveLayoutDto, UpdateProfileDto } from './dto';
import type { Response } from 'express';
import { BruteForceService } from '../common/services/brute-force.service';
import { AuditService } from '../common/services/audit.service';
import { SuspiciousLoginService } from '../common/services/suspicious-login.service';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly bruteForce: BruteForceService,
    private readonly audit: AuditService,
    private readonly suspiciousLogin: SuspiciousLoginService,
  ) {}

  private toUserDto(user: {
    id: string;
    email: string;
    username: string;
    createdAt: Date | string | null;
    initialCapital: string | number | null;
    defaultLotSize: string | number | null;
    timezone: string | null;
    theme: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.createdAt,
      initial_capital: Number(user.initialCapital) || 0,
      default_lot_size: Number(user.defaultLotSize) || 0.01,
      timezone: user.timezone ?? 'UTC',
      theme: user.theme ?? 'dark',
    };
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT configuration missing');
    }
    return secret;
  }

  private getRefreshJwtSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT configuration missing');
    }
    return secret;
  }

  async register(dto: RegisterDto) {
    const { email, username, password } = dto;

    const existing = await db.query.users.findFirst({
      where: or(eq(users.email, email), eq(users.username, username)),
    });
    if (existing) {
      throw new ConflictException('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({ email, username, passwordHash })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      });

    return user;
  }

  async login(dto: LoginDto, response: Response) {
    const { identifier, password, remember_me = false } = dto;
    const ip = response.req?.ip ?? 'unknown';
    const userAgent = response.req?.headers['user-agent'];

    const lockedOut = await this.bruteForce.isLockedOut(identifier);
    if (lockedOut) {
      await this.audit.log({
        action: 'LOGIN_LOCKOUT',
        ip,
        userAgent,
        details: { identifier: identifier.substring(0, 2) + '***' },
      });
      throw new UnauthorizedException(
        'Account temporarily locked. Try again later.',
      );
    }

    const user = await db.query.users.findFirst({
      where: or(eq(users.email, identifier), eq(users.username, identifier)),
      columns: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
      },
    });
    if (!user) {
      await this.bruteForce.recordFailedAttempt(identifier, ip);
      await this.audit.log({
        action: 'LOGIN_FAILURE',
        ip,
        userAgent,
        details: { identifier: identifier.substring(0, 2) + '***' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // OAuth users don't have passwords, so they can't login with password
    if (user.passwordHash == null) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.bruteForce.recordFailedAttempt(identifier, ip);
      await this.audit.log({
        action: 'LOGIN_FAILURE',
        ip,
        userAgent,
        details: { identifier: identifier.substring(0, 2) + '***' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.bruteForce.clearAttempts(identifier);

    const flags = await this.suspiciousLogin.detectAnomalies(user.id, ip);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ip,
      userAgent,
    });

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const jwtSecret = this.getJwtSecret();
    const refreshSecret = this.getRefreshJwtSecret();

    const accessToken = this.jwt.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });

    const refreshPayload = { ...payload, remember_me };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: remember_me ? 7 * 24 * 60 * 60 * 1000 : undefined,
      path: '/',
    });

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, username: user.username },
      suspicious_flags: flags.length > 0 ? flags : undefined,
    };
  }

  async refresh(refreshToken: string, response: Response) {
    console.log(
      '[Auth:refresh] Token present:',
      !!refreshToken,
      'length:',
      refreshToken?.length ?? 0,
    );
    if (!refreshToken) {
      console.log('[Auth:refresh] No refresh token provided — rejecting');
      throw new UnauthorizedException('No refresh token');
    }

    let payload: { sub: string; remember_me?: boolean };
    try {
      const refreshSecret = this.getRefreshJwtSecret();
      payload = this.jwt.verify(refreshToken, {
        secret: refreshSecret,
      });
      console.log('[Auth:refresh] Token verified, sub:', payload.sub);
    } catch (err: any) {
      console.log('[Auth:refresh] Token verification failed:', err?.message);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
      columns: {
        id: true,
        email: true,
        username: true,
      },
    });
    if (!user) {
      console.log('[Auth:refresh] User not found for sub:', payload.sub);
      throw new UnauthorizedException('User not found');
    }
    console.log('[Auth:refresh] Refresh successful for user:', user.email);

    const rememberMe = payload.remember_me === true;
    const newPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      remember_me: rememberMe,
    };

    const jwtSecret = this.getJwtSecret();
    const refreshSecret = this.getRefreshJwtSecret();

    const accessToken = this.jwt.sign(newPayload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });

    const newRefreshToken = this.jwt.sign(newPayload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    response.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined,
      path: '/',
    });

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async getMe(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        initialCapital: true,
        defaultLotSize: true,
        timezone: true,
        theme: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toUserDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username !== undefined || dto.email !== undefined) {
      const existing = await db.query.users.findFirst({
        where: and(
          ne(users.id, userId),
          or(
            dto.username !== undefined
              ? eq(users.username, dto.username)
              : undefined,
            dto.email !== undefined ? eq(users.email, dto.email) : undefined,
          ),
        ),
      });
      if (existing) {
        throw new ConflictException('Email or username already taken');
      }
    }

    const updateData: Record<string, string> = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.username !== undefined) updateData.username = dto.username;

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
    }

    return this.getMe(userId);
  }

  async updateSettings(
    userId: string,
    dto: {
      initial_capital?: number;
      default_lot_size?: number;
      timezone?: string;
      theme?: string;
    },
  ) {
    const updateData: Record<string, string | number> = {};
    if (dto.initial_capital !== undefined)
      updateData.initialCapital = dto.initial_capital;
    if (dto.default_lot_size !== undefined)
      updateData.defaultLotSize = dto.default_lot_size;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.theme !== undefined) updateData.theme = dto.theme;

    if (Object.keys(updateData).length === 0) {
      return this.getMe(userId);
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
        initialCapital: users.initialCapital,
        defaultLotSize: users.defaultLotSize,
        timezone: users.timezone,
        theme: users.theme,
      });
    return this.toUserDto(user);
  }

  async getLayout(userId: string) {
    const [user] = await db
      .select({ layout: users.dashboardLayout })
      .from(users)
      .where(eq(users.id, userId));
    return user?.layout ?? null;
  }

  async saveLayout(userId: string, dto: SaveLayoutDto) {
    const [user] = await db
      .update(users)
      .set({ dashboardLayout: dto as any })
      .where(eq(users.id, userId))
      .returning({ layout: users.dashboardLayout });
    return user?.layout;
  }

  async logout(response: Response) {
    response.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out' };
  }
}
