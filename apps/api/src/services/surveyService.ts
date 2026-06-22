import z from "zod";
import type { surveysCreateInput } from "../generated/prisma/models.js";
import { createSurveySchema, updateSurveySchema } from "@survey-system/schemas";
import type {
  CreateSurveyData,
  ISurveyRepository,
  ISurveyService,
  QueryString,
  Survey,
  UpdateSurveyData,
} from "../types.js";
import AppError from "../utils/appError.js";
import slugify from "slugify";
import { v7 as uuidv7 } from "uuid";
import { getLogger } from "../context/requestContext.js";

export default class SurveyService implements ISurveyService {
  constructor(private repo: ISurveyRepository) {}

  async getAll(queries: QueryString): Promise<Survey[]> {
    const results = await this.repo.getAll(queries);
    return results;
  }

  async getBySlug(slug: string): Promise<Survey> {
    const survey = await this.repo.getBySlug(slug);
    if (!survey) {
      throw new AppError(
        "Not found",
        "The requested survey doesn't exist",
        404,
      );
    }
    return survey;
  }

  async getStatsBySlug(slug: string) {
    const surveyExists = await this.repo.getSlugBySlug(slug);

    if (!surveyExists) {
      throw new AppError(
        "Not found",
        "The requested survey doesn't exist",
        404,
      );
    }

    const counts = await this.repo.getSurveyStatsBySlug(slug);
    const optionStats = await this.repo.getResponsesOptionsStatsBySlug(slug);

    return {
      totalAnswers: counts?.totalAnswers ?? 0,
      completedAnswers: counts?.completedAnswers ?? 0,
      incompleteAnswers: counts?.incompleteAnswers ?? 0,
      questionCount: counts?.questionCount ?? 0,
      optionStats,
    };
  }

  async createOne(
    survey: CreateSurveyData & { id: string; slug: string },
  ): Promise<Survey> {
    const result = z.safeParse(createSurveySchema, survey);
    if (!result.success) throw result.error;

    const slug = slugify(survey.name, { lower: true, strict: true });
    const slugExists = await this.repo.getSlugBySlug(slug);

    if (slugExists) {
      throw new AppError("Conflict", "This survey name is not avaliable", 409);
    }

    const id = uuidv7();
    const serializedData = { id, slug, ...result.data };
    return await this.repo.createOne(serializedData);
  }

  async deleteOneBySlug(slug: string): Promise<void> {
    const surveyExists = await this.repo.getSlugBySlug(slug);

    if (!surveyExists)
      throw new AppError(
        "Not found",
        "The survey you are trying to delete doesn't exist",
        404,
      );

    await this.repo.deleteOneBySlug(slug);
  }

  async updateOneBySlug(
    slug: string,
    data: UpdateSurveyData,
  ): Promise<Survey | null> {
    const existingSurvey = await this.repo.getActivatedAtBySlug(slug);
    console.log(data);

    if (!existingSurvey) {
      throw new AppError(
        "Not found",
        "The survey you are trying to update doesn't exist",
        404,
      );
    }

    if (
      existingSurvey.activatedAt &&
      Object.keys(data).length > 1 &&
      Object.keys(data).at(0) !== "isActive"
    ) {
      throw new AppError(
        "Survey already activated",
        "This survey was already activated, it can't be modified anymore",
        400,
      );
    }

    const {
      success,
      data: serializedData,
      error,
    } = z.safeParse(updateSurveySchema, data);
    if (!success) throw error;

    const newSlug = serializedData.name
      ? slugify(serializedData.name, { lower: true, strict: true })
      : slug;

    let newSlugExists = false;

    if (slug !== newSlug) {
      newSlugExists = Boolean(await this.repo.getSlugBySlug(newSlug));
    }

    if (newSlugExists) {
      throw new AppError("Conflict", "This survey name is not avaliable", 400);
    }

    const updatedSurvey = await this.repo.updateOneBySlug(slug, {
      ...serializedData,
      slug: newSlug,
      updatedAt: new Date(),
      activatedAt: serializedData.isActive ? new Date() : null,
    });

    getLogger().info(updatedSurvey, "Survey updated successfully");
    return updatedSurvey;
  }
}
