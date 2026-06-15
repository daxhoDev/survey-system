import { id } from "zod/locales";
import { prisma } from "../lib/prisma.js";
import type {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshToken,
  RefreshTokenWithUser,
  User,
  UserWithoutPassword,
} from "../types.js";
import { email } from "zod";

export default class RefreshTokenRepository implements IRefreshTokenRepository {
  async getByUserId(userId: string): Promise<RefreshToken | null> {
    const result = await prisma.refresh_tokens.findFirst({
      where: { user_id: userId, revoked_at: null },
    });

    if (!result) return null;

    const serializedData = {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };

    return serializedData;
  }

  async getUserIdByUserId(
    userId: string,
  ): Promise<Pick<RefreshToken, "userId"> | null> {
    const result = await prisma.refresh_tokens.findFirst({
      where: { user_id: userId },
      select: { user_id: true },
    });

    if (!result) return null;

    const serializedData = {
      userId: result.user_id,
    };

    return serializedData;
  }

  async getByHash(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    const result = await prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: {
        users: true,
      },
    });

    if (!result) return null;

    const serializedData = {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
      users: {
        id: result.users.id,
        email: result.users.email,
        username: result.users.username,
      },
    };
    return serializedData;
  }

  async createOne(tokenData: CreateRefreshTokenData): Promise<RefreshToken> {
    const data = {
      id: tokenData.id,
      user_id: tokenData.userId,
      token_hash: tokenData.tokenHash,
      expires_at: tokenData.expiresAt,
    };

    const result = await prisma.refresh_tokens.create({
      data,
    });

    const serializedData = {
      id: result.id,
      userId: result.user_id,
      tokenHash: result.token_hash,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };

    return serializedData;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refresh_tokens.delete({
      where: { user_id: userId },
    });
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    await prisma.refresh_tokens.delete({
      where: {
        token_hash: tokenHash,
      },
    });
  }
}
