import { Router } from "express";
import AnswerController from "../controllers/answerController.js";
import AnswerService from "../services/answerService.js";
import AnswerRepository from "../repositories/answerRepository.js";
import SurveyRepository from "../repositories/surveyRepository.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router: Router = Router({ mergeParams: true });
const authMiddleware = new AuthMiddleware();
const answerRepository = new AnswerRepository();
const surveyRepository = new SurveyRepository();
const answerService = new AnswerService(answerRepository, surveyRepository);
const answerController = new AnswerController(answerService);

router
  .route("/")
  .get(
    authMiddleware.protect.bind(authMiddleware),
    answerController.getAllFromSurvey.bind(answerController),
  )
  .post(answerController.createOne.bind(answerController));

router
  .route("/:id")
  .get(
    authMiddleware.protect.bind(authMiddleware),
    answerController.getById.bind(answerController),
  )
  .delete(
    authMiddleware.protect.bind(authMiddleware),
    answerController.deleteById.bind(answerController),
  );

export default router;
