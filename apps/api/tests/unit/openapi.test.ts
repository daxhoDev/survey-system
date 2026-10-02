import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "../../src/lib/openapi.js";

const doc = generateOpenApiDocument();
const operations = Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
  Object.entries(item as Record<string, { operationId: string; security?: unknown[]; responses: Record<string, unknown> }>).map(
    ([method, op]) => ({ path, method, ...op }),
  ),
);
const op = (operationId: string) => operations.find((o) => o.operationId === operationId)!;

describe("OpenAPI document (API-30, API-31)", () => {
  it("declares cookie authentication, not bearer tokens", () => {
    expect(Object.keys(doc.components?.securitySchemes ?? {})).toEqual([
      "cookieAuth",
      "refreshCookie",
    ]);
    expect(JSON.stringify(doc)).not.toContain("bearerAuth");
  });

  it("uses a relative server URL", () => {
    expect(doc.servers).toEqual([{ url: "/" }]);
  });

  it("documents the 19 endpoints with the operationIds used by the web client", () => {
    expect(operations.map((o) => o.operationId).sort()).toEqual(
      [
        "acceptInvitation",
        "createInvitation",
        "createSurvey",
        "createSurveyAnswer",
        "deleteSurveyAnswerById",
        "deleteSurveyBySlug",
        "getAllInvitations",
        "getAllSurveyAnswers",
        "getAllSurveys",
        "getCurrentUser",
        "getInvitationByToken",
        "getSurveyAnswerById",
        "getSurveyBySlug",
        "getSurveyStatsBySlug",
        "loginUser",
        "logoutUser",
        "refreshAuthToken",
        "revokeInvitation",
        "updateSurveyBySlug",
      ].sort(),
    );
  });

  it.each([
    ["createInvitation", "201"],
    ["acceptInvitation", "201"],
    ["revokeInvitation", "204"],
    ["createSurvey", "201"],
    ["createSurveyAnswer", "201"],
    ["deleteSurveyBySlug", "204"],
    ["deleteSurveyAnswerById", "204"],
    ["logoutUser", "204"],
    ["refreshAuthToken", "204"],
  ])("%s documents its real success status %s", (operationId, status) => {
    const successes = Object.keys(op(operationId).responses).filter((s) => s < "300");
    expect(successes).toEqual([status]);
  });

  it("documents 409 for uniqueness conflicts and 403 for repeated answers", () => {
    expect(op("createInvitation").responses).toHaveProperty("409");
    expect(op("acceptInvitation").responses).toHaveProperty("409");
    expect(op("revokeInvitation").responses).toHaveProperty("409");
  });

  it("API-34: routes with an :id parameter document 422 for an invalid UUID", () => {
    for (const id of ["revokeInvitation", "getSurveyAnswerById", "deleteSurveyAnswerById"]) {
      expect(op(id).responses, id).toHaveProperty("422");
    }
    expect(op("createSurvey").responses).toHaveProperty("409");
    expect(op("updateSurveyBySlug").responses).toHaveProperty("409");
    expect(op("createSurveyAnswer").responses).toHaveProperty("403");
  });

  it("AUTH-13: there is no public signup", () => {
    expect(Object.keys(doc.paths ?? {})).not.toContain("/api/v1/users/signup");
  });

  it("every operation documents 429 and 500", () => {
    for (const o of operations) {
      expect(o.responses, o.operationId).toHaveProperty("429");
      expect(o.responses, o.operationId).toHaveProperty("500");
    }
  });

  it("GET /surveys/{slug}, POST answers and the invitation token routes are public; the rest need the cookie", () => {
    const publicOps = [
      "loginUser",
      "createSurveyAnswer",
      "getInvitationByToken",
      "acceptInvitation",
    ];
    for (const o of operations) {
      if (publicOps.includes(o.operationId)) expect(o.security).toBeUndefined();
      else if (o.operationId === "getSurveyBySlug")
        expect(o.security).toEqual([{}, { cookieAuth: [] }]);
      else if (o.operationId === "refreshAuthToken")
        expect(o.security).toEqual([{ refreshCookie: [] }]);
      else expect(o.security, o.operationId).toEqual([{ cookieAuth: [] }]);
    }
  });
});
