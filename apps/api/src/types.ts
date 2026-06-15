import z from "zod";
import type { queryStringSchema } from "./schemas/queryStringsSchema.js";
import type { Request } from "express";
import {
  questionSchema,
  type createSurveySchema,
} from "./schemas/surveySchema.js";
import type {
  createAnswerSchema,
  responseSchema,
} from "./schemas/answerSchema.js";
import type {
  createUserSchema,
  loginDataSchema,
} from "./schemas/userSchema.js";
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
  updateOneBySlug(slug: string, data: any): Promise<Survey | null>;
  getSlugBySlug(slug: string): Promise<Pick<Survey, "slug"> | null>;
  getActivatedAtBySlug(
    slug: string,
  ): Promise<Pick<Survey, "activatedAt"> | null>;
  getSurveyStatsBySlug(
    slug: string,
  ): Promise<Pick<
    SurveyStats,
    "totalAnswers" | "completedAnswers" | "incompleteAnswers" | "questionCount"
  > | null>;
  getResponsesOptionsStatsBySlug(slug: string): Promise<OptionStats[]>;
}

export interface IAnswerRepository {
  getAllFromSurvey(slug: string): Promise<Answer[]>;
  getById(
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
  getIpByOriginIp(ip: string): Promise<Pick<Answer, "originIp"> | null>;
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
  | "getSlugBySlug"
  | "getActivatedAtBySlug"
  | "getResponsesOptionsStatsBySlug"
  | "getSurveyStatsBySlug"
> {
  getStatsBySlug(slug: string): Promise<SurveyStats>;
}
export interface IAnswerService extends Omit<
  IAnswerRepository,
  "createOne" | "getIpByOriginIp"
> {
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

export interface IAuthService {
  signup(data: CreateUserData): Promise<UserWithTokens>;
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
export type Survey = CreateSurveyData & {
  id: string;
  isActive: boolean;
  slug: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  activatedAt: Date | null;
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
}
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
