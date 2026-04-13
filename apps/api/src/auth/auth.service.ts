import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { pool } from "../db";
import { RegisterDto, LoginDto } from "./dto";
import type { Response } from "express";

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const { email, username, password } = dto;

    // Check existing
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new ConflictException("Email or username already taken");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const res = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash],
    );

    return res.rows[0];
  }

  async login(dto: LoginDto, response: Response) {
    const { identifier, password } = dto;

    const res = await pool.query(
      "SELECT id, email, username, password_hash FROM users WHERE email = $1 OR username = $1",
      [identifier],
    );
    if (res.rowCount === 0) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, email: user.email, username: user.username };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET ?? "tradezen-dev-secret",
      expiresIn: "15m",
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? "tradezen-dev-refresh-secret",
      expiresIn: "7d",
    });

    // Set refresh token as HTTP-only cookie
    response.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async refresh(refreshToken: string, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token");
    }

    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? "tradezen-dev-refresh-secret",
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Verify user still exists
    const res = await pool.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [payload.sub],
    );
    if (res.rowCount === 0) {
      throw new UnauthorizedException("User not found");
    }

    const user = res.rows[0];
    const newPayload = { sub: user.id, email: user.email, username: user.username };

    const accessToken = this.jwt.sign(newPayload, {
      secret: process.env.JWT_SECRET ?? "tradezen-dev-secret",
      expiresIn: "15m",
    });

    const newRefreshToken = this.jwt.sign(newPayload, {
      secret: process.env.JWT_REFRESH_SECRET ?? "tradezen-dev-refresh-secret",
      expiresIn: "7d",
    });

    response.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async getMe(userId: string) {
    const res = await pool.query(
      "SELECT id, email, username, created_at, initial_capital, default_lot_size, timezone, theme FROM users WHERE id = $1",
      [userId],
    );
    if (res.rowCount === 0) {
      throw new UnauthorizedException("User not found");
    }
    return res.rows[0];
  }

  async updateSettings(userId: string, dto: { initial_capital?: number; default_lot_size?: number; timezone?: string; theme?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
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
    const res = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, email, username, created_at, initial_capital, default_lot_size, timezone, theme`,
      values,
    );
    return res.rows[0];
  }

  async logout(response: Response) {
    response.clearCookie("refresh_token", { path: "/" });
    return { message: "Logged out" };
  }
}
