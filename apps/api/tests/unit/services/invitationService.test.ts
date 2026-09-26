import crypto from "crypto";
import bcrypt from "bcrypt";
import { v7 } from "uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthService from "../../../src/services/authService.js";
import InvitationService from "../../../src/services/invitationService.js";
import {
  FakeInvitationRepository,
  FakeRefreshTokenRepository,
  FakeUserRepository,
  resetStore,
  store,
} from "../../helpers/fakeRepositories.js";
import { user } from "../../helpers/fixtures.js";

const HOUR = 60 * 60 * 1000;
const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const newAccount = {
  username: "newuser",
  password: "password123",
  passwordConfirm: "password123",
};

let invitationRepo: FakeInvitationRepository;
let service: InvitationService;

beforeEach(() => {
  resetStore();
  store.users.push({
    ...user,
    password: "hash",
    createdAt: new Date(),
    deletedAt: null,
  });
  const userRepo = new FakeUserRepository();
  invitationRepo = new FakeInvitationRepository();
  service = new InvitationService(
    invitationRepo,
    userRepo,
    new AuthService(userRepo, new FakeRefreshTokenRepository()),
  );
});

describe("InvitationService.create (AUTH-23, AUTH-24)", () => {
  it("AUTH-23: returns a 32-byte base64url token and stores only its SHA-256 hash, expiring in 48 h", async () => {
    const before = Date.now();
    const { invitation, token } = await service.create("new@example.com", user.id);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(store.invitations[0]!.tokenHash).toBe(sha256(token));
    expect(invitation).not.toHaveProperty("tokenHash");
    expect(invitation).toMatchObject({
      email: "new@example.com",
      status: "pending",
      invitedBy: { id: user.id, username: user.username },
    });
    expect(invitation.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 48 * HOUR);
    expect(invitation.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 48 * HOUR);
  });

  it("AUTH-24: rejects an invalid email with a validation error", async () => {
    await expect(service.create("not-an-email", user.id)).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("AUTH-24: 409 Conflict for the email of an existing user", async () => {
    await expect(service.create(user.email, user.id)).rejects.toMatchObject({
      status: 409,
      title: "Conflict",
      detail: "There is already an user with this email",
    });
    expect(store.invitations).toHaveLength(0);
  });

  it("AUTH-24: a new invitation revokes the pending one for the same email", async () => {
    const first = await service.create("new@example.com", user.id);
    const second = await service.create("new@example.com", user.id);
    await service.create("other@example.com", user.id);

    const statuses = Object.fromEntries(
      (await service.getAll()).map((i) => [i.id, i.status]),
    );
    expect(statuses[first.invitation.id]).toBe("revoked");
    expect(statuses[second.invitation.id]).toBe("pending");
    expect(Object.values(statuses).sort()).toEqual(["pending", "pending", "revoked"]);
  });
});

describe("InvitationService status (AUTH-23, AUTH-25)", () => {
  it("derives accepted, revoked, expired and pending", async () => {
    const make = async (email: string, extra: object) => {
      const { invitation } = await service.create(email, user.id);
      Object.assign(store.invitations.find((i) => i.id === invitation.id)!, extra);
      return invitation.id;
    };
    const ids = {
      accepted: await make("a@example.com", { acceptedAt: new Date() }),
      revoked: await make("r@example.com", { revokedAt: new Date() }),
      expired: await make("e@example.com", { expiresAt: new Date(Date.now() - 1) }),
      pending: await make("p@example.com", {}),
    };

    const all = await service.getAll();
    for (const [status, id] of Object.entries(ids)) {
      expect(all.find((i) => i.id === id)!.status).toBe(status);
    }
  });
});

describe("InvitationService.revoke (AUTH-26)", () => {
  it("revokes a pending invitation", async () => {
    const { invitation } = await service.create("new@example.com", user.id);
    await service.revoke(invitation.id);
    expect(store.invitations[0]!.revokedAt).toBeInstanceOf(Date);
  });

  it("404 for an unknown id", async () => {
    await expect(service.revoke(v7())).rejects.toMatchObject({
      status: 404,
      detail: "The requested invitation doesn't exist",
    });
  });

  it("409 for an invitation that is not pending", async () => {
    const { invitation } = await service.create("new@example.com", user.id);
    store.invitations[0]!.expiresAt = new Date(Date.now() - 1);
    await expect(service.revoke(invitation.id)).rejects.toMatchObject({
      status: 409,
      detail: "This invitation is no longer pending",
    });
  });
});

describe("InvitationService.getByToken (AUTH-27)", () => {
  it("returns only the email and expiry of a pending invitation", async () => {
    const { invitation, token } = await service.create("new@example.com", user.id);
    expect(await service.getByToken(token)).toEqual({
      email: "new@example.com",
      expiresAt: invitation.expiresAt,
    });
  });

  it.each([
    ["unknown", () => undefined],
    ["expired", () => (store.invitations[0]!.expiresAt = new Date(Date.now() - 1))],
    ["revoked", () => (store.invitations[0]!.revokedAt = new Date())],
    ["accepted", () => (store.invitations[0]!.acceptedAt = new Date())],
  ])("%s → the same 404", async (kind, mutate) => {
    const { token } = await service.create("new@example.com", user.id);
    mutate();
    await expect(
      service.getByToken(kind === "unknown" ? "unknown-token" : token),
    ).rejects.toMatchObject({
      status: 404,
      title: "Not found",
      detail: "This invitation is invalid or has expired",
    });
  });
});

describe("InvitationService.accept (AUTH-28, AUTH-29)", () => {
  it("creates the user with the invitation's email, marks it accepted and issues tokens", async () => {
    const { token } = await service.create("new@example.com", user.id);

    const result = await service.accept(token, newAccount);

    expect(result.user).toMatchObject({ email: "new@example.com", username: "newuser" });
    expect(result.user).not.toHaveProperty("password");
    expect(result.accessToken).toEqual(expect.any(String));
    expect(store.refreshTokens).toHaveLength(1);
    expect(store.refreshTokens[0]!.tokenHash).toBe(sha256(result.refreshToken));
    expect(store.invitations[0]!.acceptedAt).toBeInstanceOf(Date);

    const stored = store.users.find((u) => u.email === "new@example.com")!;
    await expect(bcrypt.compare(newAccount.password, stored.password)).resolves.toBe(true);
  });

  it("AUTH-28: validates the body (strict, AUTH-11)", async () => {
    const { token } = await service.create("new@example.com", user.id);
    for (const body of [
      { ...newAccount, passwordConfirm: "different" },
      { ...newAccount, username: "ab" },
      { ...newAccount, password: "1234", passwordConfirm: "1234" },
      { ...newAccount, email: "other@example.com" },
    ]) {
      await expect(service.accept(token, body)).rejects.toMatchObject({
        name: "ZodError",
      });
    }
    expect(store.invitations[0]!.acceptedAt).toBeNull();
  });

  it("AUTH-28: an invalid token is the 404 of AUTH-27, and a token works only once", async () => {
    await expect(service.accept("unknown", newAccount)).rejects.toMatchObject({
      status: 404,
      detail: "This invitation is invalid or has expired",
    });

    const { token } = await service.create("new@example.com", user.id);
    await service.accept(token, newAccount);
    await expect(
      service.accept(token, { ...newAccount, username: "another" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("AUTH-29: 409 when the username is taken, leaving the invitation pending", async () => {
    const { token } = await service.create("new@example.com", user.id);
    await expect(
      service.accept(token, { ...newAccount, username: user.username }),
    ).rejects.toMatchObject({ status: 409, title: "Conflict" });
    expect(store.invitations[0]!.acceptedAt).toBeNull();
  });

  it("AUTH-29: 409 when the email was registered after the invitation", async () => {
    const { token } = await service.create("new@example.com", user.id);
    store.users.push({
      id: v7(),
      email: "new@example.com",
      username: "someone",
      password: "hash",
      createdAt: new Date(),
      deletedAt: null,
    });
    await expect(service.accept(token, newAccount)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("404 when the invitation stops being pending before the transaction", async () => {
    const { token } = await service.create("new@example.com", user.id);
    vi.spyOn(invitationRepo, "acceptWithNewUser").mockResolvedValue(null);

    await expect(service.accept(token, newAccount)).rejects.toMatchObject({
      status: 404,
      detail: "This invitation is invalid or has expired",
    });
    expect(store.refreshTokens).toHaveLength(0);
  });
});
