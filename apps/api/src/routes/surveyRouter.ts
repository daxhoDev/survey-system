import { Router } from "express";
import SurveyController from "../controllers/surveyController.js";
import answerRouter from "./answerRouter.js";
import SurveyRepository from "../repositories/surveyRepository.js";
import SurveyService from "../services/surveyService.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";
import AnswerController from "../controllers/answerController.js";
import AnswerService from "../services/answerService.js";
import AnswerRepository from "../repositories/answerRepository.js";

const router: Router = Router();

const authMiddleware = new AuthMiddleware();
const surveyRepository = new SurveyRepository();
const surveyService = new SurveyService(surveyRepository);
const surveyController = new SurveyController(surveyService);
const answerRepository = new AnswerRepository();
const answerService = new AnswerService(answerRepository, surveyRepository);
const answerController = new AnswerController(answerService);

router.use("/:slug/answers", answerRouter);

router
  .route("/")
  .get(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.getAll.bind(surveyController),
  )
  .post(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.createOne.bind(surveyController),
  );

router
  .route("/:slug/")
  .get(
    authMiddleware.optionalAuth.bind(authMiddleware),
    surveyController.getBySlug.bind(surveyController),
  )
  .patch(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.updateOneBySlug.bind(surveyController),
  )
  .delete(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.deleteOneBySlug.bind(surveyController),
  );

router
  .route("/:slug/stats")
  .get(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.getStatsBySlug.bind(surveyController),
  );

// Public, no session (REQ-ANS-013).
router
  .route("/:slug/answered")
  .get(answerController.getAnsweredStatus.bind(answerController));

export default router;
