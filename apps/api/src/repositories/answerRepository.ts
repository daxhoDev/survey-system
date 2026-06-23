import { tr } from "zod/v4/locales";
import type { answersCreateInput } from "../generated/prisma/models.js";
import { prisma } from "../lib/prisma.js";
import type {
  Answer,
  AnswerWithSlugAndIp,
  CreateAnswerData,
  IAnswerRepository,
  Response,
  Survey,
} from "../types.js";

export default class AnswerRepository implements IAnswerRepository {
  async getAllFromSurvey(surveySlug: string): Promise<Answer[]> {
    const results = await prisma.answers.findMany({
      where: {
        surveys: {
          slug: surveySlug,
        },
        deleted_at: null,
      },
    });

    const serializedData = results.map((r) => {
      return {
        id: r.id,
        surveyId: r.survey_id,
        responses: r.responses as Response[],
        originIp: r.origin_ip,
        createdAt: r.created_at,
        deletedAt: r.deleted_at,
      };
    });

    return serializedData;
  }

  async getById(
    id: string,
  ): Promise<
    (Answer & { surveys: Pick<Survey, "name" | "questions"> | null }) | null
  > {
    const result = await prisma.answers.findUnique({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        surveys: {
          select: {
            name: true,
            questions: true,
          },
        },
      },
    });

    if (!result) return null;

    const serializedData = {
      id: result.id,
      surveyId: result.survey_id,
      responses: result.responses as Response[],
      originIp: result.origin_ip,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
      surveys: result.surveys as Survey,
    };

    return serializedData;
  }

  async createOne({
    id,
    surveyId,
    responses,
    originIp,
  }: CreateAnswerData & {
    id: string;
    surveyId: string;
    originIp: string;
  }): Promise<Answer> {
    const data = {
      id,
      survey_id: surveyId,
      responses,
      origin_ip: originIp,
    };

    const result = await prisma.answers.create({ data });

    const serializedData = {
      id: result.id,
      surveyId: result.survey_id,
      responses: result.responses as Response[],
      originIp: result.origin_ip,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
    };

    return serializedData;
  }

  async deleteById(id: string): Promise<void> {
    await prisma.answers.update({
      where: {
        id,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async getIpAndSlugByIpAndSlug(
    ip: string,
    slug: string,
  ): Promise<AnswerWithSlugAndIp | null> {
    const result = await prisma.answers.findUnique({
      where: {
        origin_ip: ip,
        surveys: {
          slug,
        },
      },
      select: {
        origin_ip: true,
        surveys: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!result) return null;

    const serializedData = {
      originIp: result.origin_ip,
      slug: result.surveys?.slug,
    };

    return serializedData;
  }
}
