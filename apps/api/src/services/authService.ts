import z from "zod";
import type {
  IUserRepository,
  IAuthService,
  LoginData,
  CreateUserData,
  UserWithTokens,
  IRefreshTokenRepository,
  FreshTokens,
  NewAccount,
  UserPayload,
  UserWithoutPassword,
} from "../types.js";
import { createUserSchema, loginDataSchema } from "@survey-system/schemas";
import bcrypt from "bcrypt";
import { normalizeEmail } from "../utils/email.js";
import { v7 } from "uuid";
import AppError from "../utils/appError.js";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";
import crypto, { randomUUID } from "crypto";

// Compared against when the email is unknown, so login takes the same time
// whether or not the user exists (AUTH-14).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomUUID(), 10);

export default class AuthService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshRepo: IRefreshTokenRepository,
  ) {}

  // Validates a new account and hashes its password (AUTH-10, AUTH-11).
  async prepareAccount(data: CreateUserData): Promise<NewAccount> {
    const validData = z.parse(createUserSchema, data);
    const email = normalizeEmail(validData.email);

    const emailExists = await this.userRepo.getByEmail(email);
    if (emailExists) {
      throw new AppError(
        "Conflict",
        "There is already an user with this email",
        409,
      );
    }
    const usernameExists = await this.userRepo.getByUsernameOnly(
      validData.username,
    );
    if (usernameExists) {
      throw new AppError(
        "Conflict",
        "There is already an user with this username",
        409,
      );
    }

    return {
      id: v7(),
      email,
      username: validData.username,
      password: await bcrypt.hash(validData.password, 10),
    };
  }

  // Used by the create-user command (AUTH-31).
  async createAccount(data: CreateUserData): Promise<UserWithoutPassword> {
    return this.userRepo.createOne(await this.prepareAccount(data));
  }

  async issueTokens(user: UserPayload): Promise<FreshTokens> {
    return {
      accessToken: this.createSignedJwt(user.id, user.username, user.email),
      refreshToken: await this.createRefreshToken(user.id),
    };
  }

  async login(data: LoginData): Promise<UserWithTokens> {
    const {
      success,
      error,
      data: validData,
    } = z.safeParse(loginDataSchema, data);

    if (!success) {
      throw error;
    }

    const user = await this.userRepo.getByEmail(normalizeEmail(validData.email));

    const passwordIsCorrect = await this.comparePassword(
      validData.password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordIsCorrect) {
      throw new AppError(
        "Invalid credentials",
        "Invalid email or password",
        401,
      );
    }

    const accessToken = this.createSignedJwt(
      user.id,
      user.username,
      user.email,
    );

    const existingRefreshToken = await this.refreshRepo.getUserIdByUserId(
      user.id,
    );

    if (existingRefreshToken) {
      await this.refreshRepo.deleteByUserId(user.id);
    }

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshRepo.deleteByUserId(userId);
  }

  async refresh(token: string): Promise<FreshTokens> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const existingToken = await this.refreshRepo.getByHash(tokenHash);

    if (!existingToken) {
      throw new AppError(
        "Invalid token",
        "You don't have a refresh token, log in again",
        401,
      );
    }
    if (existingToken.expiresAt < new Date(Date.now())) {
      throw new AppError(
        "Token expired",
        "Your refresh token has already expired, log in again",
        401,
      );
    }

    await this.refreshRepo.deleteByHash(tokenHash);

    const accessToken = this.createSignedJwt(
      existingToken.userId,
      existingToken.users.username,
      existingToken.users.email,
    );
    const refreshToken = await this.createRefreshToken(existingToken.userId);

    return { accessToken, refreshToken };
  }

  async comparePassword(candidatePassword: string, correctPassword: string) {
    const isCorrect = await bcrypt.compare(candidatePassword, correctPassword);
    return isCorrect;
  }

  createSignedJwt(id: string, username: string, email: string) {
    const token = jwt.sign(
      {
        id,
        username,
        email,
      },
      env.JWT_SECRET,
      { expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60 },
    );
    return token;
  }

  async createRefreshToken(userId: string): Promise<string> {
    const id = v7();
    const token = randomUUID();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.refreshRepo.createOne({
      id,
      userId,
      tokenHash,
      expiresAt,
    });

    return token;
  }
}
