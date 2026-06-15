import type { NextFunction, Request, Response } from "express";
import { json } from "../utils/json.js";
import type { ISurveyService, ProtectedRequest } from "../types.js";
import { queryStringSchema } from "../schemas/queryStringsSchema.js";
import z from "zod";
import { getLogger } from "../context/requestContext.js";

export default class SurveyController {
  constructor(private service: ISurveyService) {}

  async getAll(req: ProtectedRequest, res: Response, next: NextFunction) {
    getLogger().info("fetching all surveys");
    const {
      success,
      data: queries,
      error,
    } = z.safeParse(queryStringSchema, req.query);
    if (!success) throw error;

    const surveys = await this.service.getAll(queries);

    const results = surveys.length;
    const page = queries.page || 1;
    const limit = queries.limit || 10;

    getLogger().info(
      {
        results,
        page,
        limit,
      },
      `fetched ${surveys.length} items`,
    );
    res
      .type("json")
      .status(200)
      .send(
        json({
          data: surveys,
          meta: {
            results: surveys.length,
            page: queries.page || 1,
            limit: queries.limit || 10,
          },
        }),
      );
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    getLogger().info({ slug: req.params.slug }, `Fetching survey by slug...`);
    const survey = await this.service.getBySlug(req.params.slug as string);
    res
      .type("json")
      .status(200)
      .send(json({ data: survey }));
  }

  async getStatsBySlug(req: Request, res: Response, next: NextFunction) {
    getLogger().info({ slug: req.params.slug }, `Fetching stats for survey...`);
    const stats = await this.service.getStatsBySlug(req.params.slug as string);
    res
      .type("json")
      .status(200)
      .send(json({ data: stats }));
  }

  async createOne(req: ProtectedRequest, res: Response, next: NextFunction) {
    getLogger().info({ body: req.body }, `Creating survey...`);
    const createdSurvey = await this.service.createOne(req.body);

    res
      .type("json")
      .status(201)
      .send(json({ data: createdSurvey }));
  }

  async deleteOneBySlug(req: Request, res: Response) {
    const slug = req.params.slug as string;
    getLogger().info({ slug }, `Deleting survey...`);
    await this.service.deleteOneBySlug(slug);

    res.type("json").status(204).send({ data: {} });
  }

  async updateOneBySlug(req: Request, res: Response) {
    const slug = req.params.slug as string;
    const body = req.body;
    getLogger().info({ slug, body }, `Updating survey...`);
    const updatedSurvey = await this.service.updateOneBySlug(slug, body);

    res
      .type("json")
      .status(200)
      .send(json({ data: updatedSurvey }));
  }
}
