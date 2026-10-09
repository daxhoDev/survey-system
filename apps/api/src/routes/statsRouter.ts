import { Router } from "express";
import SurveyController from "../controllers/surveyController.js";
import SurveyRepository from "../repositories/surveyRepository.js";
import SurveyService from "../services/surveyService.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

// Global statistics (STAT-08). Lives outside /surveys so it can never clash
// with a survey slug.
const router: Router = Router();

const authMiddleware = new AuthMiddleware();
const surveyController = new SurveyController(
  new SurveyService(new SurveyRepository()),
);

router
  .route("/surveys")
  .get(
    authMiddleware.protect.bind(authMiddleware),
    surveyController.getSummary.bind(surveyController),
  );

export default router;
