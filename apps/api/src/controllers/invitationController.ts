import type { Request, Response } from "express";
import { getLogger } from "../context/requestContext.js";
import {
  jwtCookieOptions,
  refreshCookieOptions,
} from "../config/cookies.js";
import type { IInvitationService, ProtectedRequest } from "../types.js";
import AppError from "../utils/appError.js";
import { json } from "../utils/json.js";

export default class InvitationController {
  constructor(private service: IInvitationService) {}

  async create(req: ProtectedRequest, res: Response) {
    if (!req.user)
      throw new AppError("Unauthenticated user", "Please, log in first", 401);
    getLogger().info("Creating invitation...");
    const created = await this.service.create(req.body?.email, req.user.id);

    res.type("json").status(201).send(json({ data: created }));
  }

  async getAll(_req: Request, res: Response) {
    getLogger().info("Fetching invitations...");
    const invitations = await this.service.getAll();

    res
      .type("json")
      .status(200)
      .send(json({ data: invitations, meta: { results: invitations.length } }));
  }

  async revoke(req: Request, res: Response) {
    const id = req.params.id as string;
    getLogger().info({ id }, "Revoking invitation...");
    await this.service.revoke(id);

    res.status(204).send();
  }

  async getByToken(req: Request, res: Response) {
    getLogger().info("Fetching invitation by token...");
    const invitation = await this.service.getByToken(req.params.token as string);

    res.type("json").status(200).send(json({ data: invitation }));
  }

  async accept(req: Request, res: Response) {
    getLogger().info("Accepting invitation...");
    const { user, accessToken, refreshToken } = await this.service.accept(
      req.params.token as string,
      req.body,
    );

    res
      .cookie("jwt", accessToken, jwtCookieOptions)
      .cookie("refresh", refreshToken, refreshCookieOptions)
      .status(201)
      .type("json")
      .send(json({ data: user }));
  }
}
