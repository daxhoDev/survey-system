// Validation limits shared by the API schemas and the web form schemas
// (ARCH-02, FE-04): the web writes its own Spanish messages but never
// repeats these numbers.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 50;
export const PASSWORD_MIN = 5;
export const SURVEY_NAME_MIN = 5;
export const QUESTION_NAME_MIN = 5;
