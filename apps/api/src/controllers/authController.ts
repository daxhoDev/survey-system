import type { CookieOptions, Request, Response } from "express";
import type {
  IAuthService,
  ProtectedRequest,
  UserWithoutPassword,
} from "../types.js";
import { json } from "../utils/json.js";
import AppError from "../utils/appError.js";
import { getLogger } from "../context/requestContext.js";

const jwtCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  maxAge: Number(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 1000, // minutes,
};
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  maxAge: Number(process.env.REFRESH_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000, //days,
  path: "/api/v1/users/refresh",
};

export default class AuthController {
  constructor(private service: IAuthService) {}

  async signup(req: Request, res: Response) {
    getLogger().info({ user: req.body }, `Registering user...`);
    const userData = req.body;
    const { user, accessToken, refreshToken } =
      await this.service.signup(userData);
    this.sendTokenAndUser(res, user, accessToken, refreshToken);
  }

  async login(req: Request, res: Response) {
    getLogger().info({ email: req.body.email }, `Logging in user...`);
    const userData = req.body;
    const { user, accessToken, refreshToken } =
      await this.service.login(userData);
    this.sendTokenAndUser(res, user, accessToken, refreshToken);
  }

  async logout(req: ProtectedRequest, res: Response) {
    const user = req.user;
    getLogger().info({ userId: user?.id }, `Logging out user...`);
    if (!user)
      throw new AppError(
        "Unauthenticated user",
        "You are already logged out",
        401,
      );

    await this.service.logout(user.id);

    res
      .clearCookie("jwt", jwtCookieOptions)
      .clearCookie("refresh", refreshCookieOptions)
      .status(204)
      .json();
  }

  async refresh(req: ProtectedRequest, res: Response) {
    const { refresh } = req.cookies;
    getLogger().info(`Refreshing token...`);
    if (!refresh)
      throw new AppError(
        "Invalid token",
        "Your token is invalid. Please, log in",
        401,
      );
    const { accessToken, refreshToken } = await this.service.refresh(refresh);

    res
      .cookie("jwt", accessToken, jwtCookieOptions)
      .cookie("refresh", refreshToken, refreshCookieOptions)
      .status(204)
      .json();
  }

  async me(req: ProtectedRequest, res: Response) {
    const currentUser = req.user;
    getLogger().info({ userId: currentUser?.id }, `Fetching current user...`);
    if (!currentUser)
      throw new AppError("Unauthenticated user", "Please, log in first", 401);

    res.type("json").status(200).send(json(currentUser));
  }

  sendTokenAndUser(
    res: Response,
    user: UserWithoutPassword,
    accessToken: string,
    refreshToken: string,
  ) {
    res
      .cookie("jwt", accessToken, jwtCookieOptions)
      .cookie("refresh", refreshToken, refreshCookieOptions)
      .status(200)
      .type("json")
      .json({ data: user });
  }
}
