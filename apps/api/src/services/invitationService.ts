import crypto from "crypto";
import { v7 } from "uuid";
import z from "zod";
import {
  acceptInvitationSchema,
  createInvitationSchema,
} from "@survey-system/schemas";
import AppError from "../utils/appError.js";
import type {
  AcceptInvitationData,
  IAuthService,
  IInvitationRepository,
  IInvitationService,
  Invitation,
  InvitationRow,
  InvitationStatus,
  IUserRepository,
  UserWithTokens,
} from "../types.js";

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000; // AUTH-23

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

function statusOf(row: InvitationRow): InvitationStatus {
  if (row.acceptedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
}

const withStatus = (row: InvitationRow): Invitation => ({
  ...row,
  status: statusOf(row),
});

// Every unusable token gets the same answer (AUTH-27).
const invalidToken = () =>
  new AppError("Not found", "This invitation is invalid or has expired", 404);

export default class InvitationService implements IInvitationService {
  constructor(
    private invitationRepo: IInvitationRepository,
    private userRepo: IUserRepository,
    private authService: IAuthService,
  ) {}

  async create(email: string, invitedBy: string) {
    const data = z.parse(createInvitationSchema, { email });

    if (await this.userRepo.getByEmail(data.email)) {
      throw new AppError(
        "Conflict",
        "There is already an user with this email",
        409,
      );
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const row = await this.invitationRepo.createReplacingPending({
      id: v7(),
      email: data.email,
      tokenHash: hashToken(token),
      invitedBy,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });
    return { invitation: withStatus(row), token };
  }

  async getAll(): Promise<Invitation[]> {
    return (await this.invitationRepo.getAll()).map(withStatus);
  }

  async revoke(id: string): Promise<void> {
    const row = await this.invitationRepo.getById(id);
    if (!row) {
      throw new AppError(
        "Not found",
        "The requested invitation doesn't exist",
        404,
      );
    }
    if (statusOf(row) !== "pending") {
      throw new AppError(
        "Conflict",
        "This invitation is no longer pending",
        409,
      );
    }
    await this.invitationRepo.revoke(id);
  }

  private async getPending(token: string): Promise<InvitationRow> {
    const row = await this.invitationRepo.getByTokenHash(hashToken(token));
    if (!row || statusOf(row) !== "pending") throw invalidToken();
    return row;
  }

  async getByToken(token: string) {
    const { email, expiresAt } = await this.getPending(token);
    return { email, expiresAt };
  }

  async accept(
    token: string,
    data: AcceptInvitationData,
  ): Promise<UserWithTokens> {
    const body = z.parse(acceptInvitationSchema, data);
    const invitation = await this.getPending(token);

    const account = await this.authService.prepareAccount({
      email: invitation.email,
      ...body,
    });
    const user = await this.invitationRepo.acceptWithNewUser(
      invitation.id,
      account,
    );
    // Accepted or revoked between the check and the transaction.
    if (!user) throw invalidToken();

    const tokens = await this.authService.issueTokens(user);
    return { user, ...tokens };
  }
}
