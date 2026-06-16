import z from "zod";
import type { answersCreateInput } from "../generated/prisma/models.js";
import { createAnswerSchema } from "@survey-system/schemas";
import AppError from "../utils/appError.js";
import {
  type Answer,
  type CreateAnswerData,
  type IAnswerRepository,
  type IAnswerService,
  type ISurveyRepository,
  type Question,
  type Response,
  type Survey,
} from "../types.js";
import { v7 } from "uuid";

export default class AnswerService implements IAnswerService {
  constructor(
    private answerRepo: IAnswerRepository,
    private surveyRepo: ISurveyRepository,
  ) {}

  async getAllFromSurvey(surveySlug: string): Promise<Answer[]> {
    return await this.answerRepo.getAllFromSurvey(surveySlug);
  }

  async getById(
    id: string,
  ): Promise<
    (Answer & { surveys: Pick<Survey, "name" | "questions"> | null }) | null
  > {
    return await this.answerRepo.getById(id);
  }

  async createOne(
    answer: CreateAnswerData,
    slug: string,
    originIp: string,
  ): Promise<Answer> {
    const { success, error, data } = z.safeParse(createAnswerSchema, answer);
    if (!success) throw error;

    const existingIp = await this.answerRepo.getIpByOriginIp(originIp);
    if (existingIp) {
      throw new AppError(
        "You already submitted an answer",
        "Your IP already submitted an answer for this survey",
        403,
      );
    }

    const referencedSurvey = await this.surveyRepo.getBySlug(slug);
    if (!referencedSurvey)
      throw new AppError(
        "Not found",
        "The survey you are trying to answer doesn't exist",
        404,
      );

    const serializedData = this.validateAnswerCreation(referencedSurvey, data);

    const id = v7();

    return await this.answerRepo.createOne({
      id,
      surveyId: referencedSurvey.id,
      ...serializedData,
      originIp,
    });
  }

  async deleteById(id: string) {
    await this.answerRepo.deleteById(id);
  }

  validateAnswerCreation(
    survey: Survey,
    answer: CreateAnswerData,
  ): CreateAnswerData {
    const responses: Response[] = answer.responses;
    const questions: Question[] = survey.questions;
    const requiredQuestions = questions.filter((q) => q.isRequired);
    const responseIdArr = responses.map((r) => r.id);

    // Validate correct responses array size
    if (
      responses.length < requiredQuestions.length ||
      responses.length > questions.length
    ) {
      throw new AppError(
        "Validation error",
        "There are missing or exceeding responses",
        400,
      );
    }

    // Validate there are no wrong id's
    if (
      !responseIdArr.every((responseId) =>
        questions
          .map((q) => {
            return q.id;
          })
          .includes(responseId),
      )
    ) {
      throw new AppError(
        "Validation error",
        "Each response id must match a question id",
        400,
      );
    }

    // Validate all required questions are responded
    if (
      !requiredQuestions
        .map((q) => q.id)
        .every((questionId) => responseIdArr.includes(questionId))
    ) {
      throw new AppError(
        "Validation error",
        "All required questions must be answered",
        400,
      );
    }

    // Validate there are no repeated id's
    if (responseIdArr.length !== new Set(responseIdArr).size) {
      throw new AppError(
        "Validation error",
        "Each response id must be unique",
        400,
      );
    }

    // Validate diferent question types are correctly responded
    let message = "";
    if (
      !responses.every((response) => {
        const matchingQuestion = questions.find((q) => q.id === response.id);

        if (matchingQuestion?.type === "SINGLE_SELECT") {
          if (
            !(response.content instanceof Array) ||
            !(matchingQuestion?.options?.map((o) => o.id) ?? []).includes(
              response.content?.at(0) as any,
            )
          ) {
            message =
              "The response content for a single selection question must be an array with it's option id";
            return false;
          }
        }

        if (matchingQuestion?.type === "MULTI_SELECT") {
          if (
            !(response.content instanceof Array) ||
            !response.content.every((responseId) =>
              matchingQuestion?.options?.map((o) => o.id).includes(responseId),
            )
          ) {
            message =
              "The response content for a multi selection question must be an array of valid option id's";
            console.log(response, matchingQuestion);
            return false;
          }
        }

        if (matchingQuestion?.type === "TEXT_ANSWER") {
          if (typeof response.content !== "string") {
            message =
              "The response content for a text question must be a string";
            return false;
          }
        }
        return true;
      })
    ) {
      throw new AppError("Validation error", message, 400);
    }

    return answer;
  }
}
