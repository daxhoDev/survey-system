import type { NextFunction, Request, Response } from "express";
import { getLogger } from "../context/requestContext.js";
import { json } from "../utils/json.js";
import type { IAnswerService } from "../types.js";

export default class AnswerController {
  constructor(private service: IAnswerService) {}

  async getAllFromSurvey(req: Request, res: Response) {
    getLogger().info(
      { slug: req.params.slug },
      `Fetching answers for survey...`,
    );
    const answers = await this.service.getAllFromSurvey(
      req.params.slug as string,
    );
    res
      .status(200)
      .type("json")
      .send(json({ data: answers, meta: { results: answers.length } }));
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id;
    getLogger().info({ id }, `Fetching answer by ID...`);
    const answer = await this.service.getById(id as string);

    res
      .type("json")
      .status(200)
      .send(json({ data: answer }));
  }

  async createOne(req: Request, res: Response) {
    getLogger().info({ slug: req.params.slug }, `Creating answer...`);
    const createdAnswer = await this.service.createOne(
      req.body,
      req.params.slug as string,
      req.ip || "",
    );
    ~res
      .status(200)
      .type("json")
      .send(json({ data: createdAnswer }));
  }

  async deleteById(req: Request, res: Response) {
    const id = req.params.id;
    getLogger().info({ id }, `Deleting answer...`);
    await this.service.deleteById(id as string);

    res.type("json").status(204).send();
  }
}
