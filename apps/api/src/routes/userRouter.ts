import { Router } from "express";
import AuthController from "../controllers/authController.js";
import AuthService from "../services/authService.js";
import UserRepository from "../repositories/userRepository.js";
import RefreshTokenRepository from "../repositories/refreshTokenRepository.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router: Router = Router();
const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();
const userService = new AuthService(userRepo, refreshRepo);
const authController = new AuthController(userService);
const authMiddleware = new AuthMiddleware();

router.post("/signup", authController.signup.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post(
  "/logout",
  authMiddleware.protect,
  authController.logout.bind(authController),
);
router.post("/refresh", authController.refresh.bind(authController));
router.get(
  "/me",
  authMiddleware.protect,
  authController.me.bind(authController),
);

export default router;
