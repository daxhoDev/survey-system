import type { Answer, Question, Survey } from "../../src/types.js";

export const questions: Question[] = [
  {
    id: 1,
    name: "Are you happy at our company?",
    type: "SINGLE_SELECT",
    options: [
      { id: 1, content: "Yes" },
      { id: 2, content: "No" },
    ],
    isRequired: true,
  },
  {
    id: 2,
    name: "Which benefits do you use?",
    type: "MULTI_SELECT",
    options: [
      { id: 1, content: "Gym" },
      { id: 2, content: "Lunch" },
      { id: 3, content: "Training" },
    ],
    isRequired: false,
  },
  {
    id: 3,
    name: "Anything else to tell us?",
    type: "TEXT_ANSWER",
    isRequired: false,
  },
];

export function buildSurvey(overrides: Partial<Survey> = {}): Survey {
  return {
    id: "0190a0a0-0000-7000-8000-000000000001",
    name: "Employee Satisfaction Survey",
    slug: "employee-satisfaction-survey",
    questions,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: null,
    deletedAt: null,
    activatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

export function buildAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    id: "0190a0a0-0000-7000-8000-0000000000a1",
    surveyId: buildSurvey().id,
    responses: [{ id: 1, content: [1] }],
    originIp: "203.0.113.10",
    createdAt: new Date("2026-01-03T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

export const user = {
  id: "0190a0a0-0000-7000-8000-0000000000b1",
  username: "owner",
  email: "owner@example.com",
};
