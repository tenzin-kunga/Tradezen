import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { pool } from '../db';
import { RegisterDto, LoginDto } from './dto';
import type { Response } from 'express';
import { BruteForceService } from '../common/services/brute-force.service';
import { AuditService } from '../common/services/audit.service';
import { SuspiciousLoginService } from '../common/services/suspicious-login.service';

const SALT_ROUNDS = 12;

interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  created_at: Date;
  initial_capital?: number;
  default_lot_size?: number;
  timezone?: string;
  theme?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly bruteForce: BruteForceService,
    private readonly audit: AuditService,
    private readonly suspiciousLogin: SuspiciousLoginService,
  ) {}

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

    const existing = await pool.query<User>(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const res = await pool.query<User>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash],
    );

    return res.rows[0];
  }

  async login(dto: LoginDto, response: Response) {
    const { identifier, password, remember_me = false } = dto;
    const ip = response.req?.ip ?? 'unknown';
    const userAgent = response.req?.headers['user-agent'];

    const lockedOut = await this.bruteForce.isLockedOut(identifier);
    if (lockedOut) {
      await this.audit.log({ action: 'LOGIN_LOCKOUT', ip, userAgent, details: { identifier: identifier.substring(0, 2) + '***' } });
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const res = await pool.query<User>(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1 OR username = $1',
      [identifier],
    );
    if ((res.rowCount ?? 0) === 0) {
      await this.bruteForce.recordFailedAttempt(identifier, ip);
      await this.audit.log({ action: 'LOGIN_FAILURE', ip, userAgent, details: { identifier: identifier.substring(0, 2) + '***' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = res.rows[0]!;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await this.bruteForce.recordFailedAttempt(identifier, ip);
      await this.audit.log({ action: 'LOGIN_FAILURE', ip, userAgent, details: { identifier: identifier.substring(0, 2) + '***' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.bruteForce.clearAttempts(identifier);

    const flags = await this.suspiciousLogin.detectAnomalies(Number(user.id), ip);

    await this.audit.log({ userId: Number(user.id), action: 'LOGIN_SUCCESS', ip, userAgent });

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
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    let payload: { sub: string; remember_me?: boolean };
    try {
      const refreshSecret = this.getRefreshJwtSecret();
      payload = this.jwt.verify(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const res = await pool.query<User>(
      'SELECT id, email, username FROM users WHERE id = $1',
      [payload.sub],
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = res.rows[0]!;
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
    const res = await pool.query<User>(
      'SELECT id, email, username, created_at, initial_capital, default_lot_size, timezone, theme FROM users WHERE id = $1',
      [userId],
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new UnauthorizedException('User not found');
    }
    return res.rows[0];
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
    const fields: string[] = [];
    const values: (string | number | undefined)[] = [];
    let idx = 1;

    if (dto.initial_capital !== undefined) {
      fields.push(`initial_capital = $${idx++}`);
      values.push(dto.initial_capital);
    }
    if (dto.default_lot_size !== undefined) {
      fields.push(`default_lot_size = $${idx++}`);
      values.push(dto.default_lot_size);
    }
    if (dto.timezone !== undefined) {
      fields.push(`timezone = $${idx++}`);
      values.push(dto.timezone);
    }
    if (dto.theme !== undefined) {
      fields.push(`theme = $${idx++}`);
      values.push(dto.theme);
    }

    if (fields.length === 0) {
      return this.getMe(userId);
    }

    values.push(userId);
    const res = await pool.query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, username, created_at, initial_capital, default_lot_size, timezone, theme`,
      values,
    );
    return res.rows[0];
  }

  async logout(response: Response) {
    response.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out' };
  }
}
