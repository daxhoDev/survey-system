import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AuthService from "../../../src/services/authService.js";
import type {
  IRefreshTokenRepository,
  IUserRepository,
} from "../../../src/types.js";
import { user } from "../../helpers/fixtures.js";

const PASSWORD = "correct-password";
let passwordHash: string;

let userRepo: { [K in keyof IUserRepository]: ReturnType<typeof vi.fn> };
let refreshRepo: {
  [K in keyof IRefreshTokenRepository]: ReturnType<typeof vi.fn>;
};
let service: AuthService;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 10);
});

beforeEach(() => {
  userRepo = {
    createOne: vi.fn(async (data) => ({
      id: data.id,
      username: data.username,
      email: data.email,
      createdAt: new Date(),
      deletedAt: null,
    })),
    getByEmail: vi.fn(async (email: string) =>
      email === user.email
        ? { ...user, password: passwordHash, createdAt: new Date(), deletedAt: null }
        : null,
    ),
    getByUsernameOnly: vi.fn().mockResolvedValue(null),
  };
  refreshRepo = {
    getByUserId: vi.fn().mockResolvedValue(null),
    getByHash: vi.fn().mockResolvedValue(null),
    getUserIdByUserId: vi.fn().mockResolvedValue(null),
    createOne: vi.fn(async (data) => ({ ...data, createdAt: new Date() })),
    deleteByUserId: vi.fn().mockResolvedValue(undefined),
    deleteByHash: vi.fn().mockResolvedValue(undefined),
  };
  service = new AuthService(
    userRepo as unknown as IUserRepository,
    refreshRepo as unknown as IRefreshTokenRepository,
  );
});

describe("AuthService.login", () => {
  it("AUTH-14: unknown email and wrong password give the same 401", async () => {
    const unknown = await service
      .login({ email: "nobody@example.com", password: PASSWORD })
      .catch((e) => e);
    const wrong = await service
      .login({ email: user.email, password: "wrong-password" })
      .catch((e) => e);

    for (const error of [unknown, wrong]) {
      expect(error).toMatchObject({
        status: 401,
        title: "Invalid credentials",
        detail: "Invalid email or password",
      });
    }
  });

  it("AUTH-14: runs bcrypt even when the email is unknown", async () => {
    const compare = vi.spyOn(service, "comparePassword");
    await service
      .login({ email: "nobody@example.com", password: PASSWORD })
      .catch(() => undefined);

    expect(compare).toHaveBeenCalledOnce();
  });

  it("AUTH-15: replaces the existing refresh token and returns the user without password", async () => {
    refreshRepo.getUserIdByUserId.mockResolvedValue({ userId: user.id });

    const result = await service.login({ email: user.email, password: PASSWORD });

    expect(refreshRepo.deleteByUserId).toHaveBeenCalledWith(user.id);
    expect(refreshRepo.createOne).toHaveBeenCalledOnce();
    expect(result.user).not.toHaveProperty("password");
    expect(result.user).toMatchObject({ id: user.id, email: user.email });
  });

  it("AUTH-01: the access JWT carries { id, username, email } and lasts ACCESS_TOKEN_TTL_MINUTES", async () => {
    const { accessToken } = await service.login({
      email: user.email,
      password: PASSWORD,
    });
    const payload = jwt.verify(
      accessToken,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;

    expect(payload).toMatchObject(user);
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
  });

  it("AUTH-02: stores only the SHA-256 hash of the refresh token, expiring in REFRESH_TOKEN_TTL_DAYS", async () => {
    const before = Date.now();
    const { refreshToken } = await service.login({
      email: user.email,
      password: PASSWORD,
    });
    const stored = refreshRepo.createOne.mock.calls[0]![0];

    expect(stored.tokenHash).toBe(
      crypto.createHash("sha256").update(refreshToken).digest("hex"),
    );
    expect(stored.tokenHash).not.toBe(refreshToken);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(stored.expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDays);
    expect(stored.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + sevenDays);
  });
});

describe("AuthService.signup", () => {
  const body = {
    email: "new@example.com",
    username: "newuser",
    password: "password123",
    passwordConfirm: "password123",
  };

  it("AUTH-10: 409 Conflict when the email is taken", async () => {
    await expect(
      service.signup({ ...body, email: user.email }),
    ).rejects.toMatchObject({ status: 409, title: "Conflict" });
  });

  it("AUTH-10: 409 Conflict when the username is taken", async () => {
    userRepo.getByUsernameOnly.mockResolvedValue({ username: body.username });
    await expect(service.signup(body)).rejects.toMatchObject({
      status: 409,
      title: "Conflict",
    });
  });

  it("AUTH-11: stores a bcrypt hash, never the password", async () => {
    await service.signup(body);
    const stored = userRepo.createOne.mock.calls[0]![0];

    expect(stored.password).not.toBe(body.password);
    await expect(bcrypt.compare(body.password, stored.password)).resolves.toBe(true);
  });
});

describe("AuthService.logout (AUTH-16)", () => {
  it("is idempotent: succeeds whether or not a refresh token exists", async () => {
    await expect(service.logout(user.id)).resolves.toBeUndefined();
    expect(refreshRepo.deleteByUserId).toHaveBeenCalledWith(user.id);
  });
});

describe("AuthService.refresh", () => {
  it("AUTH-19: 401 Invalid token for an unknown token", async () => {
    await expect(service.refresh("unknown")).rejects.toMatchObject({
      status: 401,
      title: "Invalid token",
    });
  });

  it("AUTH-19: 401 Token expired, without deleting the row", async () => {
    refreshRepo.getByHash.mockResolvedValue({
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000),
      users: user,
    });
    await expect(service.refresh("old")).rejects.toMatchObject({
      status: 401,
      title: "Token expired",
    });
    expect(refreshRepo.deleteByHash).not.toHaveBeenCalled();
  });

  it("AUTH-04, AUTH-20: rotates the refresh token and issues a new pair", async () => {
    refreshRepo.getByHash.mockResolvedValue({
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
      users: user,
    });

    const tokens = await service.refresh("current");

    expect(refreshRepo.deleteByHash).toHaveBeenCalledWith(
      crypto.createHash("sha256").update("current").digest("hex"),
    );
    expect(refreshRepo.createOne).toHaveBeenCalledOnce();
    expect(tokens.refreshToken).not.toBe("current");
    expect(jwt.decode(tokens.accessToken)).toMatchObject(user);
  });
});
