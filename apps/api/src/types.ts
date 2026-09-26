import z from "zod";
import type {
  queryStringSchema,
  updateSurveySchema,
} from "@survey-system/schemas";
import type { Request } from "express";
import {
  questionSchema,
  type createSurveySchema,
} from "@survey-system/schemas";
import type {
  createAnswerSchema,
  responseSchema,
} from "@survey-system/schemas";
import type {
  acceptInvitationSchema,
  createUserSchema,
  loginDataSchema,
} from "@survey-system/schemas";
import type { Logger } from "pino";

//////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
// REPOSITORIES
export interface ISurveyRepository {
  getAll(queries: QueryString): Promise<Survey[]>;
  getBySlug(slug: string): Promise<Survey | null>;
  createOne(
    survey: CreateSurveyData & { id: string; slug: string },
  ): Promise<Survey>;
  deleteOneBySlug(slug: string): Promise<void>;
  updateOneBySlug(
    slug: string,
    changes: SurveyChanges,
  ): Promise<Survey | null>;
  getSlugBySlug(slug: string): Promise<Pick<Survey, "slug"> | null>;
  getIsLockedBySlug(
    slug: string,
  ): Promise<Pick<Survey, "isLocked"> | null>;
  getSurveyStatsBySlug(
    slug: string,
  ): Promise<Pick<
    SurveyStats,
    "totalAnswers" | "completedAnswers" | "incompleteAnswers" | "questionCount"
  > | null>;
  getResponsesOptionsStatsBySlug(slug: string): Promise<OptionStats[]>;
}

export interface IAnswerRepository {
  getAllFromSurvey(surveyId: string): Promise<Answer[]>;
  getById(
    surveyId: string,
    id: string,
  ): Promise<
    (Answer & { surveys: Pick<Survey, "name" | "questions"> | null }) | null
  >;
  createOne(
    answer: CreateAnswerData & {
      id: string;
      surveyId: string;
      originIp: string;
    },
  ): Promise<Answer>;
  deleteById(id: string): Promise<void>;
  getIpBySurveyIdAndIp(
    surveyId: string,
    ip: string,
  ): Promise<Pick<Answer, "originIp"> | null>;
}

export interface IUserRepository {
  createOne(
    data: Omit<CreateUserData, "passwordConfirm"> & { id: string },
  ): Promise<UserWithoutPassword>;
  getByEmail(email: string): Promise<User | null>;
  getByUsernameOnly(username: string): Promise<Pick<User, "username"> | null>;
}

export interface IRefreshTokenRepository {
  getByUserId(userId: string): Promise<RefreshToken | null>;
  getByHash(tokenHash: string): Promise<RefreshTokenWithUser | null>;
  getUserIdByUserId(
    userId: string,
  ): Promise<Pick<RefreshToken, "userId"> | null>;
  createOne(tokenData: CreateRefreshTokenData): Promise<RefreshToken>;
  deleteByUserId(userId: string): Promise<void>;
  deleteByHash(tokenHash: string): Promise<void>;
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// SERVICES

export interface ISurveyService extends Omit<
  ISurveyRepository,
  | "getBySlug"
  | "getSlugBySlug"
  | "getIsLockedBySlug"
  | "getResponsesOptionsStatsBySlug"
  | "getSurveyStatsBySlug"
> {
  getBySlug(slug: string, session: Session): Promise<Survey>;
  getStatsBySlug(slug: string): Promise<SurveyStats>;
}
export interface IAnswerService {
  getAllFromSurvey(surveySlug: string): Promise<Answer[]>;
  getById(
    surveySlug: string,
    id: string,
  ): Promise<Answer & { surveys: Pick<Survey, "name" | "questions"> | null }>;
  deleteById(surveySlug: string, id: string): Promise<void>;
  createOne(
    answer: CreateAnswerData,
    slug: string,
    originIp: string,
  ): Promise<Answer>;
  validateAnswerCreation(
    survey: Survey,
    answer: CreateAnswerData,
  ): CreateAnswerData;
}

export interface IInvitationRepository {
  createReplacingPending(invitation: NewInvitation): Promise<InvitationRow>;
  getAll(): Promise<InvitationRow[]>;
  getById(id: string): Promise<InvitationRow | null>;
  getByTokenHash(tokenHash: string): Promise<InvitationRow | null>;
  revoke(id: string): Promise<void>;
  // Creates the user and marks the invitation accepted atomically; null if
  // the invitation was accepted or revoked meanwhile.
  acceptWithNewUser(
    invitationId: string,
    account: NewAccount,
  ): Promise<UserWithoutPassword | null>;
}

export interface IInvitationService {
  create(email: string, invitedBy: string): Promise<{ invitation: Invitation; token: string }>;
  getAll(): Promise<Invitation[]>;
  revoke(id: string): Promise<void>;
  getByToken(token: string): Promise<Pick<Invitation, "email" | "expiresAt">>;
  accept(token: string, data: AcceptInvitationData): Promise<UserWithTokens>;
}

export interface IAuthService {
  prepareAccount(data: CreateUserData): Promise<NewAccount>;
  createAccount(data: CreateUserData): Promise<UserWithoutPassword>;
  issueTokens(user: UserPayload): Promise<FreshTokens>;
  login(data: LoginData): Promise<UserWithTokens>;
  logout(id: string): Promise<void>;
  refresh(token: string): Promise<FreshTokens>;
  comparePassword(
    candidatePassword: string,
    correctPassword: string,
  ): Promise<boolean>;
  createRefreshToken(userId: string): Promise<string>;
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

export type CreateSurveyData = z.infer<typeof createSurveySchema>;
export type UpdateSurveyData = z.infer<typeof updateSurveySchema>;
// Columns an update writes; absent keys are left unchanged (SURV-14).
export type SurveyChanges = {
  name?: string;
  questions?: Question[];
  slug: string;
  updatedAt: Date;
  isActive?: boolean;
  activatedAt?: Date | null;
  isLocked?: true;
};

export type Survey = CreateSurveyData & {
  id: string;
  isActive: boolean;
  slug: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  activatedAt: Date | null;
  isLocked: boolean;
};
export type Question = z.infer<typeof questionSchema>;

export type CreateAnswerData = z.infer<typeof createAnswerSchema>;
export type Answer = CreateAnswerData & {
  id: string;
  surveyId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  originIp: string;
};
export type Response = z.infer<typeof responseSchema>;

export type CreateUserData = z.infer<typeof createUserSchema>;
export type User = Omit<CreateUserData, "passwordConfirm"> & {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
};
export type UserWithoutPassword = Omit<User, "password">;
export type UserWithTokens = {
  user: UserWithoutPassword;
  accessToken: string;
  refreshToken: string;
};
export type UserPayload = Pick<User, "id" | "username" | "email">;

export type QueryString = z.infer<typeof queryStringSchema>;

export interface ProtectedRequest extends Request {
  user?: UserPayload;
  sessionExpired?: boolean;
}

export type Session = "authenticated" | "expired" | "anonymous";
export type LoginData = z.infer<typeof loginDataSchema>;

export type CreateRefreshTokenData = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  userId: string;
};
export type RefreshToken = CreateRefreshTokenData & {
  id: string;
  userId: string;
  createdAt: Date;
};
export type RefreshTokenWithUser = RefreshToken & {
  users: UserPayload;
};
export type FreshTokens = Omit<UserWithTokens, "user">;

export type OptionStats = {
  questionId: number;
  questionName: string;
  options: {
    optionContent: string;
    responseCount: number;
  }[];
};

export type SurveyStats = {
  totalAnswers: number;
  completedAnswers: number;
  incompleteAnswers: number;
  questionCount: number;
  optionStats: OptionStats[];
};

export interface RequestContext {
  // requestId: string;
  // userId?: string;
  logger: Logger;
}

export type AcceptInvitationData = z.infer<typeof acceptInvitationSchema>;
// A validated, hashed account ready to insert (AUTH-10, AUTH-11).
export type NewAccount = { id: string; email: string; username: string; password: string };
export type NewInvitation = {
  id: string;
  email: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
};
export type InvitationRow = {
  id: string;
  email: string;
  invitedBy: { id: string; username: string } | null;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
};
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type Invitation = InvitationRow & { status: InvitationStatus };
