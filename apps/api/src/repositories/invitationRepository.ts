import { prisma } from "../lib/prisma.js";
import type {
  IInvitationRepository,
  InvitationRow,
  NewAccount,
  NewInvitation,
  UserWithoutPassword,
} from "../types.js";

const select = {
  id: true,
  email: true,
  created_at: true,
  expires_at: true,
  accepted_at: true,
  revoked_at: true,
  users: { select: { id: true, username: true } },
} as const;

type Row = {
  id: string;
  email: string;
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  users: { id: string; username: string } | null;
};

function serialize(row: Row): InvitationRow {
  return {
    id: row.id,
    email: row.email,
    invitedBy: row.users,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  };
}

// Only these rows can still be accepted or revoked.
const pendingWhere = () => ({
  accepted_at: null,
  revoked_at: null,
  expires_at: { gt: new Date() },
});

export default class InvitationRepository implements IInvitationRepository {
  async createReplacingPending(invitation: NewInvitation): Promise<InvitationRow> {
    const [, created] = await prisma.$transaction([
      prisma.invitations.updateMany({
        where: { email: invitation.email, ...pendingWhere() },
        data: { revoked_at: new Date() },
      }),
      prisma.invitations.create({
        data: {
          id: invitation.id,
          email: invitation.email,
          token_hash: invitation.tokenHash,
          invited_by: invitation.invitedBy,
          expires_at: invitation.expiresAt,
        },
        select,
      }),
    ]);
    return serialize(created);
  }

  async getAll(): Promise<InvitationRow[]> {
    const rows = await prisma.invitations.findMany({
      select,
      orderBy: { created_at: "desc" },
    });
    return rows.map(serialize);
  }

  async getById(id: string): Promise<InvitationRow | null> {
    const row = await prisma.invitations.findUnique({ where: { id }, select });
    return row ? serialize(row) : null;
  }

  async getByTokenHash(tokenHash: string): Promise<InvitationRow | null> {
    const row = await prisma.invitations.findUnique({
      where: { token_hash: tokenHash },
      select,
    });
    return row ? serialize(row) : null;
  }

  async revoke(id: string): Promise<void> {
    await prisma.invitations.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
  }

  async acceptWithNewUser(
    invitationId: string,
    account: NewAccount,
  ): Promise<UserWithoutPassword | null> {
    return prisma.$transaction(async (tx) => {
      const accepted = await tx.invitations.updateMany({
        where: { id: invitationId, ...pendingWhere() },
        data: { accepted_at: new Date() },
      });
      if (accepted.count === 0) return null;

      const user = await tx.users.create({
        data: account,
        select: {
          id: true,
          username: true,
          email: true,
          created_at: true,
          deleted_at: true,
        },
      });
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
        deletedAt: user.deleted_at,
      };
    });
  }
}
