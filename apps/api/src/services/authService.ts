import z from "zod";
import type {
  IUserRepository,
  IAuthService,
  LoginData,
  UserWithoutPassword,
  CreateUserData,
  UserWithTokens,
  IRefreshTokenRepository,
  FreshTokens,
} from "../types.js";
import { createUserSchema, loginDataSchema } from "@survey-system/schemas";
import bcrypt from "bcrypt";
import { v7 } from "uuid";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import crypto, { randomUUID } from "crypto";

export default class AuthService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshRepo: IRefreshTokenRepository,
  ) {}

  async signup(data: CreateUserData): Promise<UserWithTokens> {
    const {
      success,
      data: validData,
      error,
    } = z.safeParse(createUserSchema, data);

    if (!success) {
      throw error;
    }

    const emailExists = await this.userRepo.getByEmail(validData.email);
    if (emailExists) {
      throw new AppError(
        "Conflict",
        "There is already an user with this email",
        400,
      );
    }
    const usernameExists = await this.userRepo.getByUsernameOnly(
      validData.username,
    );
    if (usernameExists) {
      throw new AppError(
        "Conflict",
        "There is already an user with this username",
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(validData.password, 10);

    const userId = v7();
    const user = await this.userRepo.createOne({
      id: userId,
      email: validData.email,
      username: validData.username,
      password: hashedPassword,
    });

    const refreshToken = await this.createRefreshToken(userId);
    const accessToken = this.createSignedJwt(
      userId,
      validData.username,
      validData.email,
    );

    return {
      user,
      accessToken,
      refreshToken,
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

    const user = await this.userRepo.getByEmail(validData.email);

    if (!user) {
      throw new AppError("Not found", "This email is not registered", 404);
    }

    const passwordIsCorrect = await this.comparePassword(
      validData.password,
      user.password,
    );

    if (!passwordIsCorrect) {
      throw new AppError(
        "Incorrect credentials",
        "Your password is incorrect, try again",
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
    const refreshExists = await this.refreshRepo.getUserIdByUserId(userId);
    if (!refreshExists)
      throw new AppError(
        "Invalid token",
        "You don't have a refresh token",
        500,
      );

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
      process.env.JWT_SECRET as string,
      {
        expiresIn: process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      } as jwt.SignOptions,
    );
    return token;
  }

  async createRefreshToken(userId: string): Promise<string> {
    const id = v7();
    const token = randomUUID();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(
      Date.now() +
        Number(process.env.REFRESH_EXPIRES_IN /* days */) * 24 * 60 * 60 * 1000,
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
