# 13 — Statistics

[← Back to index](MAIN.md) · Related: [11 Surveys](11-surveys.md), [12 Answers](12-answers.md), [20 Frontend](20-frontend.md)

Code: `SurveyController.getStatsBySlug`, `SurveyService.getStatsBySlug`,
`SurveyRepository.getSurveyStatsBySlug` and `getResponsesOptionsStatsBySlug` (raw SQL).
Schema: `surveyStatsSchema`, `optionStatsSchema` in `packages/schemas/src/surveySchema.ts`.

## GET `/api/v1/surveys/:slug/stats` — authenticated

- **STAT-01** `[implemented]` Unknown or deleted slug → `404 Not found`.
- **STAT-02** `[implemented]` Response `200 { data: SurveyStats }`:

```jsonc
{
  "totalAnswers": 100,        // non-deleted answers of the survey
  "completedAnswers": 80,     // answers with responses.length == questions.length
  "incompleteAnswers": 20,    // answers with responses.length <  questions.length
  "questionCount": 15,        // questions.length
  "optionStats": [            // one entry per SELECT question (ordered by question id)
    {
      "questionId": 1,
      "questionName": "Favorite Color?",
      "options": [ { "optionContent": "Red", "responseCount": 10 } ]   // every option, count may be 0
    }
  ]
}
```

- **STAT-03** `[implemented]` Counts are computed in PostgreSQL with `jsonb_array_length` / `jsonb_array_elements`; aggregates come back as `BigInt` and are serialized as numbers (API-04).
- **STAT-04** `[implemented]` `optionStats` counts, for each option of each select question, how many answers selected it (`MULTI_SELECT` answers count once per selected option). `TEXT_ANSWER` questions do not appear.
- **STAT-05** `[implemented]` Question and option ids are cast to `int` in SQL; they must be integers (DATA-09/10).
- **STAT-06** `[open: OQ-06]` `optionStats` currently includes **soft-deleted** answers (the `expanded_responses` CTE does not filter `answers.deleted_at`), while `totalAnswers`/`completedAnswers`/`incompleteAnswers` exclude them.
- **STAT-07** `[implemented]` With no answers, all counts are `0` and every option has `responseCount: 0`.
