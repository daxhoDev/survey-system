// In-memory repositories for HTTP tests without a database. They are wired in
// with vi.mock on the repository modules (see tests/unit/http).
import type {
  Answer,
  CreateAnswerData,
  CreateRefreshTokenData,
  CreateSurveyData,
  IAnswerRepository,
  IInvitationRepository,
  InvitationRow,
  NewAccount,
  NewInvitation,
  IRefreshTokenRepository,
  ISurveyRepository,
  IUserRepository,
  QueryString,
  RefreshToken,
  Survey,
  SurveyChanges,
  User,
} from "../../src/types.js";

export const store = {
  users: [] as (User & { password: string })[],
  refreshTokens: [] as RefreshToken[],
  surveys: [] as Survey[],
  answers: [] as Answer[],
  invitations: [] as (InvitationRow & { tokenHash: string })[],
};

export function resetStore() {
  store.users = [];
  store.refreshTokens = [];
  store.surveys = [];
  store.answers = [];
  store.invitations = [];
}

const liveSurvey = (slug: string) =>
  store.surveys.find((s) => s.slug === slug && !s.deletedAt) ?? null;

export class FakeUserRepository implements IUserRepository {
  async createOne(data: Omit<User, "createdAt" | "deletedAt">) {
    const user = { ...data, createdAt: new Date(), deletedAt: null };
    store.users.push(user);
    const { password: _password, ...withoutPassword } = user;
    return withoutPassword;
  }
  async getByEmail(email: string) {
    return store.users.find((u) => u.email === email && !u.deletedAt) ?? null;
  }
  async getByUsernameOnly(username: string) {
    const user = store.users.find((u) => u.username === username && !u.deletedAt);
    return user ? { username: user.username } : null;
  }
}

export class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  async getByUserId(userId: string) {
    return store.refreshTokens.find((t) => t.userId === userId) ?? null;
  }
  async getByHash(tokenHash: string) {
    const token = store.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return null;
    const user = store.users.find((u) => u.id === token.userId)!;
    return {
      ...token,
      users: { id: user.id, username: user.username, email: user.email },
    };
  }
  async getUserIdByUserId(userId: string) {
    const token = await this.getByUserId(userId);
    return token ? { userId: token.userId } : null;
  }
  async createOne(data: CreateRefreshTokenData) {
    const token = { ...data, createdAt: new Date() };
    store.refreshTokens.push(token);
    return token;
  }
  async deleteByUserId(userId: string) {
    store.refreshTokens = store.refreshTokens.filter((t) => t.userId !== userId);
  }
  async deleteByHash(tokenHash: string) {
    store.refreshTokens = store.refreshTokens.filter(
      (t) => t.tokenHash !== tokenHash,
    );
  }
}

export class FakeSurveyRepository implements ISurveyRepository {
  async getAll(_queries: QueryString) {
    return store.surveys.filter((s) => !s.deletedAt);
  }
  async getBySlug(slug: string) {
    return liveSurvey(slug);
  }
  async createOne(data: CreateSurveyData & { id: string; slug: string }) {
    const survey: Survey = {
      ...data,
      isActive: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
      activatedAt: null,
    };
    store.surveys.push(survey);
    return survey;
  }
  async deleteOneBySlug(slug: string) {
    const survey = liveSurvey(slug);
    if (survey) survey.deletedAt = new Date();
  }
  async updateOneBySlug(slug: string, data: SurveyChanges) {
    const survey = liveSurvey(slug);
    if (!survey) return null;
    Object.assign(survey, data);
    return survey;
  }
  async getSlugBySlug(slug: string) {
    const survey = liveSurvey(slug);
    return survey ? { slug: survey.slug } : null;
  }
  async getIsLockedBySlug(slug: string) {
    const survey = liveSurvey(slug);
    return survey ? { isLocked: survey.isLocked } : null;
  }
  async getSurveyStatsBySlug() {
    return null;
  }
  async getResponsesOptionsStatsBySlug() {
    return [];
  }
}

export class FakeAnswerRepository implements IAnswerRepository {
  async getAllFromSurvey(surveyId: string) {
    return store.answers.filter((a) => a.surveyId === surveyId && !a.deletedAt);
  }
  async getById(surveyId: string, id: string) {
    const answer = store.answers.find(
      (a) => a.id === id && a.surveyId === surveyId && !a.deletedAt,
    );
    if (!answer) return null;
    const survey = store.surveys.find((s) => s.id === surveyId)!;
    return {
      ...answer,
      surveys: { name: survey.name, questions: survey.questions },
    };
  }
  async createOne(
    data: CreateAnswerData & { id: string; surveyId: string; originIp: string },
  ) {
    const answer: Answer = { ...data, createdAt: new Date(), deletedAt: null };
    store.answers.push(answer);
    return answer;
  }
  async deleteById(id: string) {
    const answer = store.answers.find((a) => a.id === id);
    if (answer) answer.deletedAt = new Date();
  }
  async getIpBySurveyIdAndIp(surveyId: string, ip: string) {
    const answer = store.answers.find(
      (a) => a.surveyId === surveyId && a.originIp === ip,
    );
    return answer ? { originIp: answer.originIp } : null;
  }
}

const isPending = (i: InvitationRow) =>
  !i.acceptedAt && !i.revokedAt && i.expiresAt.getTime() > Date.now();

const withoutHash = ({ tokenHash: _hash, ...row }: InvitationRow & { tokenHash: string }) => row;

export class FakeInvitationRepository implements IInvitationRepository {
  async createReplacingPending(invitation: NewInvitation) {
    for (const i of store.invitations) {
      if (i.email === invitation.email && isPending(i)) i.revokedAt = new Date();
    }
    const inviter = store.users.find((u) => u.id === invitation.invitedBy);
    const row = {
      id: invitation.id,
      email: invitation.email,
      tokenHash: invitation.tokenHash,
      invitedBy: inviter ? { id: inviter.id, username: inviter.username } : null,
      createdAt: new Date(),
      expiresAt: invitation.expiresAt,
      acceptedAt: null,
      revokedAt: null,
    };
    store.invitations.push(row);
    return withoutHash(row);
  }
  async getAll() {
    return [...store.invitations]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(withoutHash);
  }
  async getById(id: string) {
    const row = store.invitations.find((i) => i.id === id);
    return row ? withoutHash(row) : null;
  }
  async getByTokenHash(tokenHash: string) {
    const row = store.invitations.find((i) => i.tokenHash === tokenHash);
    return row ? withoutHash(row) : null;
  }
  async revoke(id: string) {
    store.invitations.find((i) => i.id === id)!.revokedAt = new Date();
  }
  async acceptWithNewUser(invitationId: string, account: NewAccount) {
    const invitation = store.invitations.find((i) => i.id === invitationId);
    if (!invitation || !isPending(invitation)) return null;
    invitation.acceptedAt = new Date();
    return new FakeUserRepository().createOne(account);
  }
}
