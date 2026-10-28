import {
  getGetSurveyStatsBySlugQueryKey,
  useGetSurveyStatsBySlug,
} from "@/lib/api/surveys/surveys";
import type { Survey } from "@/lib/api/sondixAPI.schemas";
import SmallMultiples, { type SmallMultipleCell } from "./SmallMultiples";
import { StackedBar } from "./Bar";
import { EmptyState, ErrorState, SkeletonRules } from "./DataStates";

const numberFormat = new Intl.NumberFormat("es-CU");

// "1 respuesta" / "83 respuestas".
const count = (n: number, singular: string, plural: string) =>
  `${numberFormat.format(n)} ${n === 1 ? singular : plural}`;

// Share as a whole percentage, e.g. "86%" (no space before "%", REQ-BRAND-028).
const percent = (value: number, total: number) =>
  `${numberFormat.format(total > 0 ? Math.round((value / total) * 100) : 0)}%`;

// The "Estadísticas" tab (REQ-FE-033), read like a yearbook page: summary
// line, completion bar, small multiples per select question on one common
// scale (0 to the number of answers), and a closing line for text questions.
// Mounted only while its tab is open, so the stats load lazily (REQ-FE-022).
export default function SurveyStatistics({ survey }: { survey: Survey }) {
  const { data, isPending, isError, isFetching, refetch } =
    useGetSurveyStatsBySlug(survey.slug, {
      query: { queryKey: getGetSurveyStatsBySlugQueryKey(survey.slug) },
    });

  if (isPending) {
    return (
      <SkeletonRules
        label="Cargando estadísticas..."
        widths={["60%", "100%", "40%", "100%", "100%", "100%"]}
      />
    );
  }

  if (isError) {
    return (
      <ErrorState onRetry={() => refetch()} retrying={isFetching}>
        Error al cargar las estadísticas
      </ErrorState>
    );
  }

  const stats = data.data;
  const total = stats.totalAnswers;

  if (total === 0) {
    return <EmptyState>Todavía no hay respuestas para esta encuesta.</EmptyState>;
  }

  const questionIndex = new Map(survey.questions.map((q, i) => [q.id, i]));
  const textQuestions = survey.questions.filter(
    (q) => q.type === "TEXT_ANSWER",
  ).length;
  const typeOf = (questionId: number) => {
    const index = questionIndex.get(questionId);
    return index === undefined ? undefined : survey.questions[index].type;
  };
  const anyMultiple = stats.optionStats.some(
    (q) => typeOf(q.questionId) === "MULTI_SELECT",
  );

  const cells: SmallMultipleCell[] = stats.optionStats.map((question) => {
    const index = questionIndex.get(question.questionId);
    const type = typeOf(question.questionId);
    return {
      key: String(question.questionId),
      title: `${(index ?? question.questionId - 1) + 1}. ${question.questionName}`,
      subtitle: type === "MULTI_SELECT" ? "Selección múltiple" : "Selección única",
      bars: question.options.map((option) => ({
        label: option.optionContent,
        value: option.responseCount,
        valueText: `${numberFormat.format(option.responseCount)} · ${percent(option.responseCount, total)}`,
        valueWidth: "6rem",
      })),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <p className="figures text-body text-ink">
        {count(total, "respuesta", "respuestas")} ·{" "}
        {count(stats.completedAnswers, "completa", "completas")} ·{" "}
        {count(stats.incompleteAnswers, "incompleta", "incompletas")} ·{" "}
        {count(stats.questionCount, "pregunta", "preguntas")}
      </p>

      <div className="flex flex-col gap-2">
        <StackedBar
          scaleMax={total}
          segments={[
            { key: "completed", value: stats.completedAnswers, tone: "teal" },
            { key: "incomplete", value: stats.incompleteAnswers, tone: "rust" },
          ]}
        />
        <div className="figures flex flex-wrap justify-between gap-x-6 gap-y-1 text-caption text-ink">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 shrink-0 bg-teal" />
            Completas {numberFormat.format(stats.completedAnswers)} (
            {percent(stats.completedAnswers, total)})
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 shrink-0 bg-rust" />
            Incompletas {numberFormat.format(stats.incompleteAnswers)} (
            {percent(stats.incompleteAnswers, total)})
          </span>
        </div>
      </div>

      {cells.length > 0 && (
        <SmallMultiples
          label="Respuestas por pregunta"
          columns={3}
          cells={cells}
          scaleMax={total}
          caption={
            <>
              <span className="figures">
                Escala común: 0–{numberFormat.format(total)} respuestas (100%)
              </span>
              {anyMultiple && (
                <>
                  <span aria-hidden="true"> · </span>
                  En selección múltiple los porcentajes pueden sumar más de
                  100%
                </>
              )}
            </>
          }
        />
      )}

      {textQuestions > 0 && (
        <p className="text-body text-ink-muted">
          {textQuestions === 1
            ? "1 pregunta de texto libre"
            : `${numberFormat.format(textQuestions)} preguntas de texto libre`}
          : consulta sus respuestas en la pestaña Respuestas.
        </p>
      )}
    </div>
  );
}
