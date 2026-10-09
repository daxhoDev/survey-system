import { Router } from "express";
import InvitationController from "../controllers/invitationController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";
import InvitationRepository from "../repositories/invitationRepository.js";
import RefreshTokenRepository from "../repositories/refreshTokenRepository.js";
import UserRepository from "../repositories/userRepository.js";
import AuthService from "../services/authService.js";
import InvitationService from "../services/invitationService.js";
import limiter from "../utils/limiter.js";

const router: Router = Router();
const authMiddleware = new AuthMiddleware();
const userRepository = new UserRepository();
const authService = new AuthService(userRepository, new RefreshTokenRepository());
const invitationService = new InvitationService(
  new InvitationRepository(),
  userRepository,
  authService,
);
const invitationController = new InvitationController(invitationService);

router
  .route("/")
  .post(
    authMiddleware.protect.bind(authMiddleware),
    invitationController.create.bind(invitationController),
  )
  .get(
    authMiddleware.protect.bind(authMiddleware),
    invitationController.getAll.bind(invitationController),
  );

router.delete(
  "/:id",
  authMiddleware.protect.bind(authMiddleware),
  invitationController.revoke.bind(invitationController),
);

// Public token routes use the stricter limiter too (AUTH-30).
router.get(
  "/token/:token",
  limiter(true),
  invitationController.getByToken.bind(invitationController),
);
router.post(
  "/token/:token/accept",
  limiter(true),
  invitationController.accept.bind(invitationController),
);

export default router;
