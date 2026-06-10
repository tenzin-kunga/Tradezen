import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, or, and } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { users, accounts } from '@tradezen/db';
import type { Response } from 'express';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName: string;
  username: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface OAuthUserResponse {
  id: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class OAuthService {
  constructor(private readonly jwt: JwtService) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    return secret;
  }

  private getRefreshJwtSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return secret;
  }

  async validateOAuthUser(profile: OAuthProfile): Promise<OAuthUserResponse> {
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.provider, profile.provider),
        eq(accounts.providerId, profile.providerId),
      ),
      with: {
        user: true,
      },
    });

    if (existingAccount && existingAccount.user) {
      await this.updateAccountTokens(
        existingAccount.id,
        profile.accessToken,
        profile.refreshToken,
      );

      return this.generateTokens(existingAccount.user);
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, profile.email),
    });

    if (existingUser) {
      await db
        .insert(accounts)
        .values({
          userId: existingUser.id,
          provider: profile.provider,
          providerId: profile.providerId,
          providerEmail: profile.email,
          providerUsername: profile.username,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
        })
        .returning({ id: accounts.id });

      await db
        .update(users)
        .set({ authMethod: 'both' })
        .where(eq(users.id, existingUser.id));

      return this.generateTokens(existingUser);
    }

    const username = await this.getUniqueUsername(profile.username);

    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
        username,
        passwordHash: null,
        authMethod: 'oauth',
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      });

    await db.insert(accounts).values({
      userId: newUser.id,
      provider: profile.provider,
      providerId: profile.providerId,
      providerEmail: profile.email,
      providerUsername: profile.username,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    return this.generateTokens(newUser);
  }

  async linkAccount(userId: string, profile: OAuthProfile): Promise<void> {
    const existingAccount = await db.query.accounts.findFirst({
      where: or(
        eq(accounts.provider, profile.provider),
        eq(accounts.providerId, profile.providerId),
      ),
    });

    if (existingAccount) {
      throw new ConflictException(
        'This OAuth account is already linked to another user',
      );
    }

    const existingUserAccount = await db.query.accounts.findFirst({
      where: or(
        eq(accounts.userId, userId),
        eq(accounts.provider, profile.provider),
      ),
    });

    if (
      existingUserAccount &&
      existingUserAccount.provider === profile.provider
    ) {
      await db
        .update(accounts)
        .set({
          providerId: profile.providerId,
          providerEmail: profile.email,
          providerUsername: profile.username,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
        })
        .where(eq(accounts.id, existingUserAccount.id));
      return;
    }

    await db.insert(accounts).values({
      userId,
      provider: profile.provider,
      providerId: profile.providerId,
      providerEmail: profile.email,
      providerUsername: profile.username,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    await db
      .update(users)
      .set({ authMethod: 'both' })
      .where(eq(users.id, userId));
  }

  async unlinkAccount(userId: string, provider: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    const accountCount = await db.query.accounts.findMany({
      where: eq(accounts.userId, userId),
    });

    if (accountCount.length <= 1 && user.authMethod === 'oauth') {
      throw new ConflictException('Cannot unlink your only login method');
    }

    await db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)));

    const remainingAccounts = await db.query.accounts.findMany({
      where: eq(accounts.userId, userId),
    });

    if (remainingAccounts.length === 0) {
      await db
        .update(users)
        .set({ authMethod: 'password' })
        .where(eq(users.id, userId));
    }
  }

  async getLinkedAccounts(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { authMethod: true },
    });

    const accountsList = await db.query.accounts.findMany({
      where: eq(accounts.userId, userId),
      columns: {
        id: true,
        provider: true,
        providerEmail: true,
        providerUsername: true,
        createdAt: true,
      },
    });

    return {
      authMethod: user?.authMethod ?? 'password',
      accounts: accountsList,
    };
  }

  setOAuthTokens(response: Response, userResponse: OAuthUserResponse) {
    response.cookie('refresh_token', userResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      access_token: userResponse.accessToken,
      user: {
        id: userResponse.id,
        email: userResponse.email,
        username: userResponse.username,
      },
    };
  }

  private async getUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!existing) {
        return username;
      }

      username = `${baseUsername}${counter}`;
      counter++;
    }
  }

  private async updateAccountTokens(
    accountId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    await db
      .update(accounts)
      .set({
        accessToken,
        refreshToken: refreshToken ?? accounts.refreshToken,
      })
      .where(eq(accounts.id, accountId));
  }

  private generateTokens(user: any): OAuthUserResponse {
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

    const refreshToken = this.jwt.sign(
      { ...payload, remember_me: true },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      accessToken,
      refreshToken,
    };
  }
}
