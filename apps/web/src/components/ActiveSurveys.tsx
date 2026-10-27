import { Link, type To } from "react-router";
import { useGetActiveSurveyStats } from "@/lib/api/stats/stats";
import SmallMultiples, { type SmallMultipleCell } from "./SmallMultiples";
import { EmptyState, ErrorState } from "./DataStates";
import { commonScaleMax } from "@/lib/scale";

const LABEL = "Encuestas activas";
const numberFormat = new Intl.NumberFormat("es-CU");

interface ActiveSurveysProps {
  /** How many surveys are active in total (summary `active`), when known. */
  activeCount?: number;
  /** The list URL filtered to Activas. */
  showAllTo: To;
  /** Called when "Ver todas las activas" is pressed (moves focus to the list). */
  onShowAll: () => void;
}

// Small multiples of the most recently activated surveys (REQ-FE-032), on
// one common scale. Loads on its own: the rest of the page does not wait.
export default function ActiveSurveys({
  activeCount,
  showAllTo,
  onShowAll,
}: ActiveSurveysProps) {
  const { data, isPending, isError, isFetching, refetch } =
    useGetActiveSurveyStats();

  if (isPending) {
    return <SmallMultiples label={LABEL} cells={[]} scaleMax={10} caption="" loading />;
  }

  if (isError) {
    return (
      <section aria-label={LABEL} className="border-y border-rule-strong px-4 py-3">
        <ErrorState onRetry={() => refetch()} retrying={isFetching}>
          Error al cargar las encuestas activas
        </ErrorState>
      </section>
    );
  }

  const surveys = data.data;
  if (surveys.length === 0) {
    return (
      <section aria-label={LABEL} className="border-y border-rule-strong px-4 py-3">
        <EmptyState>
          No hay encuestas activas. Activa una encuesta para empezar a recoger
          respuestas.
        </EmptyState>
      </section>
    );
  }

  const scaleMax = commonScaleMax(
    Math.max(...surveys.map((s) => s.totalAnswers)),
  );
  const cells: SmallMultipleCell[] = surveys.map((s) => ({
    key: s.slug,
    title: s.name,
    href: `/dashboard/surveys/${s.slug}`,
    figure: (
      <>
        {numberFormat.format(s.totalAnswers)}
        <span className="sr-only"> respuestas</span>
      </>
    ),
    bars: [
      { label: "Completas", value: s.completedAnswers, labelWidth: "4.75rem", valueWidth: "2.5rem" },
      {
        label: "Incompletas",
        value: s.incompleteAnswers,
        tone: "rust",
        labelWidth: "4.75rem",
        valueWidth: "2.5rem",
      },
    ],
  }));
  const more = activeCount !== undefined && activeCount > surveys.length;

  return (
    <SmallMultiples
      label={LABEL}
      cells={cells}
      scaleMax={scaleMax}
      caption={
        <>
          <span className="figures">
            Escala común: 0–{numberFormat.format(scaleMax)} respuestas
          </span>
          {more && (
            <>
              <span aria-hidden="true"> · </span>
              <Link
                to={showAllTo}
                replace
                onClick={onShowAll}
                className="text-teal underline underline-offset-3 hover:decoration-2"
              >
                Ver todas las activas
              </Link>
            </>
          )}
        </>
      }
    />
  );
}
