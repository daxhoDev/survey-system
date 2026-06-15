import { sl } from "zod/locales";
import type {
  surveysCreateInput,
  surveysOrderByWithRelationInput,
} from "../generated/prisma/models.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateSurveyData,
  ISurveyRepository,
  OptionStats,
  QueryString,
  Question,
  Survey,
  SurveyStats,
} from "../types.js";

export default class SurveyRepository implements ISurveyRepository {
  defaultTake = 10;
  defaultSkip = 0;

  async getAll({
    search,
    active,
    date,
    page,
    limit,
    sort,
  }: QueryString): Promise<Survey[]> {
    const where: any = {
      deleted_at: null,
    };

    const orderBy: surveysOrderByWithRelationInput[] = [];

    // Handle sort
    if (sort === "name") {
      orderBy.push({ name: "asc" }, { created_at: "desc" });
    }
    if (sort === "-name") {
      orderBy.push({ name: "desc" }, { created_at: "desc" });
    }
    if (sort === "creation") {
      orderBy.push({ created_at: "asc" }, { name: "asc" });
    }
    if (sort === "-creation") {
      orderBy.push({ created_at: "desc" }, { name: "asc" });
    }

    // Handle seearch
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    //Handle active
    if (active !== undefined) {
      where.is_active = active;
    }

    //Handle date
    if (date) {
      const start = date;
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      where.created_at = {
        gte: start,
        lt: end,
      };
    }

    const results = await prisma.surveys.findMany({
      where,
      take: limit ? limit : this.defaultTake,
      skip: page ? (page - 1) * this.defaultTake : this.defaultSkip,
      orderBy,
    });

    const serializedData: Survey[] = results.map((r) => {
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        questions: r.questions as Question[],
        isActive: r.is_active,
        createdAt: r.created_at,
        deletedAt: r.deleted_at,
        updatedAt: r.updated_at,
        activatedAt: r.activated_at,
      };
    });

    return serializedData;
  }

  async getBySlug(slug: string): Promise<Survey | null> {
    const result = await prisma.surveys.findFirst({
      where: { slug, deleted_at: null },
    });

    if (!result) return null;

    const serializedData: Survey = {
      id: result.id,
      name: result.name,
      slug: result.slug,
      questions: result.questions as Question[],
      isActive: result.is_active,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
      updatedAt: result.updated_at,
      activatedAt: result.activated_at,
    };

    return serializedData;
  }

  async createOne(survey: CreateSurveyData & { id: string; slug: string }) {
    const data = {
      id: survey.id,
      slug: survey.slug,
      name: survey.name,
      questions: survey.questions,
    };

    const result = await prisma.surveys.create({ data });

    const serializedData: Survey = {
      id: result.id,
      name: result.name,
      slug: result.slug,
      questions: result.questions as Question[],
      isActive: result.is_active,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
      updatedAt: result.updated_at,
      activatedAt: result.activated_at,
    };

    return serializedData;
  }

  async deleteOneBySlug(slug: string): Promise<void> {
    await prisma.surveys.update({
      where: { slug },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async updateOneBySlug(slug: string, data: any): Promise<Survey | null> {
    const result = await prisma.surveys.update({
      where: { slug },
      data,
    });

    const serializedData = {
      id: result.id,
      name: result.name,
      slug: result.slug,
      questions: result.questions as Question[],
      isActive: result.is_active,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
      updatedAt: result.updated_at,
      activatedAt: result.activated_at,
    };

    return serializedData;
  }

  async getSlugBySlug(slug: string): Promise<Pick<Survey, "slug"> | null> {
    const result = await prisma.surveys.findUnique({
      where: { slug, deleted_at: null },
      select: { slug: true },
    });

    if (!result) return null;

    const serializedData = {
      slug: result.slug,
    };

    return serializedData;
  }

  async getActivatedAtBySlug(
    slug: string,
  ): Promise<Pick<Survey, "activatedAt"> | null> {
    const result = await prisma.surveys.findUnique({
      where: { slug, deleted_at: null },
      select: {
        activated_at: true,
      },
    });

    if (!result) return null;

    const serializedData = {
      activatedAt: result.activated_at,
    };

    return serializedData;
  }

  async getSurveyStatsBySlug(
    slug: string,
  ): Promise<Pick<
    SurveyStats,
    "totalAnswers" | "completedAnswers" | "incompleteAnswers" | "questionCount"
  > | null> {
    const result: {
      total_answers: number;
      completed_answers: number;
      incomplete_answers: number;
      question_count: number;
    }[] = await prisma.$queryRaw`
      SELECT
        coalesce(count(a.*), 0) as total_answers,
        coalesce(sum(case when jsonb_array_length(a.responses) = jsonb_array_length(s.questions) then 1 else 0 end), 0) as completed_answers,
        coalesce(sum(case when jsonb_array_length(a.responses) < jsonb_array_length(s.questions) then 1 else 0 end), 0) as incomplete_answers,
        jsonb_array_length(s.questions) as question_count
      from surveys s
      left join answers a on a.survey_id = s.id and a.deleted_at is null
      where s.slug = ${slug} and s.deleted_at is null
      group by s.questions;
    `;

    if (!result[0]) return null;

    const serializedData = {
      totalAnswers: result[0].total_answers,
      completedAnswers: result[0].completed_answers,
      incompleteAnswers: result[0].incomplete_answers,
      questionCount: result[0].question_count,
    };
    return serializedData;
  }

  async getResponsesOptionsStatsBySlug(slug: string) {
    const response: {
      id: number;
      name: string;
      option_content: string;
      response_count: number;
    }[] = await prisma.$queryRaw`
      WITH expanded_questions AS (SELECT (q ->> 'id')::int   AS id,
                                   q ->> 'name'        AS name,
                                   q ->> 'type'        AS type,
                                   (opt ->> 'id')::int AS option_id,
                                   opt ->> 'content'   AS option_content
                            FROM surveys
                                     CROSS JOIN LATERAL jsonb_array_elements(surveys.questions) AS q
                                     CROSS JOIN LATERAL jsonb_array_elements(q -> 'options') AS opt
                            WHERE slug = ${slug}),
     expanded_responses AS (SELECT (resp ->> 'id')::int AS question_id,
                                   elem::int            AS selected_option_id
                            FROM answers
                                     CROSS JOIN LATERAL jsonb_array_elements(answers.responses) AS resp
                                     CROSS JOIN LATERAL jsonb_array_elements_text(resp -> 'content') AS elem
                            WHERE answers.survey_id = (SELECT id FROM surveys WHERE slug = ${slug})
                              AND jsonb_typeof(resp -> 'content') = 'array')
SELECT eq.id, eq.name,
       eq.option_content,
       COUNT(er.selected_option_id)::int AS response_count
FROM expanded_questions eq
         LEFT JOIN expanded_responses er
                   ON eq.id = er.question_id
                       AND eq.option_id = er.selected_option_id
GROUP BY eq.id, eq.name, eq.option_content ORDER BY eq.id;`;

    const map = new Map<number, OptionStats>();

    for (const row of response) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          questionId: row.id,
          questionName: row.name,
          options: [],
        });
      }

      map.get(row.id)!.options.push({
        optionContent: row.option_content,
        responseCount: row.response_count,
      });
    }

    return Array.from(map.values());
  }
}
