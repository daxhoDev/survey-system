import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import {
  useGetSurveyBySlug,
  useUpdateSurveyBySlug,
  useDeleteSurveyBySlug,
  getGetAllSurveysQueryKey,
  getGetSurveyBySlugQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  useGetAllSurveyAnswers,
  useDeleteSurveyAnswerById,
  getGetAllSurveyAnswersQueryKey,
} from "@/lib/api/answers/answers";
import {
  getGetActiveSurveyStatsQueryKey,
  getGetSurveySummaryQueryKey,
} from "@/lib/api/stats/stats";
import type {
  Answer,
  Survey,
  SurveyQuestionsItem,
  SurveyQuestionsItemType,
} from "@/lib/api/sondixAPI.schemas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import LockedBadge from "@/components/LockedBadge";
import StatusLabel from "@/components/StatusLabel";
import SurveyStatistics from "@/components/SurveyStatistics";
import {
  EmptyState,
  ErrorState,
  LoadingLine,
  SkeletonRules,
} from "@/components/DataStates";

const typeLabel: Record<SurveyQuestionsItemType, string> = {
  TEXT_ANSWER: "Respuesta de texto",
  SINGLE_SELECT: "Selección única",
  MULTI_SELECT: "Selección múltiple",
};

const dateTime = (iso: string) => new Date(iso).toLocaleString("es-CU");

/** Location state set by the survey list: its query string, to go back to it. */
interface SurveyDetailsLocationState {
  listSearch?: string;
}

// Survey details (REQ-FE-021, REQ-FE-022): back link, header with status and
// actions, and the tabs "Detalles", "Respuestas" and "Estadísticas". Tab
// panels mount only while open, so answers and statistics load lazily.
export default function SurveyDetailsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  const listSearch = (location.state as SurveyDetailsLocationState | null)
    ?.listSearch;
  const backTo = listSearch ? `/dashboard?${listSearch}` : "/dashboard";

  const { data, isPending, isError, isFetching, refetch } = useGetSurveyBySlug(
    slug,
    { query: { enabled: !!slug, queryKey: getGetSurveyBySlugQueryKey(slug) } },
  );
  const survey = data?.data;

  const updateSurvey = useUpdateSurveyBySlug({
    mutation: {
      onSuccess() {
        for (const queryKey of [
          getGetSurveyBySlugQueryKey(slug),
          getGetAllSurveysQueryKey(),
          getGetSurveySummaryQueryKey(),
          getGetActiveSurveyStatsQueryKey(),
        ]) {
          queryClient.invalidateQueries({ queryKey });
        }
        toast.success("Estado de la encuesta actualizado");
      },
      onError(err) {
        toast.error(err.detail || "Error al actualizar estado");
      },
    },
  });

  const deleteSurvey = useDeleteSurveyBySlug({
    mutation: {
      onSuccess() {
        for (const queryKey of [
          getGetAllSurveysQueryKey(),
          getGetSurveySummaryQueryKey(),
          getGetActiveSurveyStatsQueryKey(),
        ]) {
          queryClient.invalidateQueries({ queryKey });
        }
        toast.success("Encuesta eliminada correctamente");
        navigate("/dashboard");
      },
      onError(err) {
        toast.error(err.detail || "Error al eliminar la encuesta");
      },
    },
  });

  const backLink = (
    <Link
      to={backTo}
      className="inline-flex w-fit items-center gap-2 text-body text-ink-muted transition-colors duration-150 ease-out hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Encuestas
    </Link>
  );

  if (isPending && !!slug) {
    return (
      <div className="flex flex-col gap-6 py-8">
        {backLink}
        <LoadingLine>Cargando encuesta...</LoadingLine>
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div className="flex flex-col gap-6 py-8">
        {backLink}
        <ErrorState onRetry={() => refetch()} retrying={isFetching}>
          No se pudo cargar la encuesta.
        </ErrorState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-4">
        {backLink}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-h1 text-balance break-words">{survey.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusLabel status={survey.isActive ? "Activa" : "Inactiva"} />
              {survey.isLocked && <LockedBadge />}
              <span className="figures text-small break-all text-ink-muted">
                {survey.slug}
              </span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 md:flex">
            <Button
              variant="outline"
              onClick={() =>
                updateSurvey.mutate({
                  slug: survey.slug,
                  data: { isActive: !survey.isActive },
                })
              }
              loading={updateSurvey.isPending}
            >
              {survey.isActive ? (
                <>
                  {!updateSurvey.isPending && <Pause aria-hidden="true" />}
                  <span>Desactivar</span>
                </>
              ) : (
                <>
                  {!updateSurvey.isPending && <Play aria-hidden="true" />}
                  <span>Activar</span>
                </>
              )}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={deleteSurvey.isPending}>
                  <Trash2 aria-hidden="true" />
                  <span>Eliminar</span>
                </Button>
              </DialogTrigger>
              <ConfirmationDialog
                confirmText="Eliminar"
                description={`¿Estás seguro de que deseas eliminar la encuesta "${survey.name}"?`}
                onConfirm={() => deleteSurvey.mutate({ slug: survey.slug })}
                isPending={deleteSurvey.isPending}
              />
            </Dialog>
          </div>
        </header>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList aria-label="Secciones de la encuesta">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="answers">Respuestas</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <DetailsTab survey={survey} />
        </TabsContent>
        <TabsContent value="answers">
          <AnswersTab survey={survey} />
        </TabsContent>
        <TabsContent value="stats">
          <SurveyStatistics survey={survey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// "Detalles": the public link and the numbered, ruled list of questions.
function DetailsTab({ survey }: { survey: Survey }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/surveys/${survey.slug}`;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
  };

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="public-link" className="flex flex-col gap-2">
        <h2 id="public-link" className="text-h2 text-balance">
          Compartir encuesta
        </h2>
        <p className="text-small text-ink-muted">
          Copia este enlace para enviarlo a los encuestados.
        </p>
        <div className="flex items-center gap-2">
          <p
            title={publicUrl}
            className="figures flex h-11 min-w-0 flex-1 items-center truncate rounded-control border border-input-border bg-paper px-3 text-body text-ink select-all md:h-10"
          >
            <span className="truncate">{publicUrl}</span>
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label="Copiar enlace"
            title="Copiar enlace"
          >
            {copied ? (
              <Check aria-hidden="true" className="text-teal" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            asChild
            aria-label="Abrir enlace"
            title="Abrir enlace"
          >
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="questions" className="flex flex-col gap-2">
        <h2 id="questions" className="text-h2 text-balance">
          Preguntas
        </h2>
        <p className="figures text-small text-ink-muted">
          {survey.questions.length === 1
            ? "Esta encuesta contiene 1 pregunta."
            : `Esta encuesta contiene ${survey.questions.length} preguntas.`}
        </p>
        <ol className="mt-2 border-y border-rule-strong">
          {survey.questions.map((question, idx) => (
            <QuestionRow key={question.id} question={question} number={idx + 1} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function QuestionRow({
  question,
  number,
}: {
  question: SurveyQuestionsItem;
  number: number;
}) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-rule py-4 not-first:border-t">
      <span className="figures text-body font-semibold text-ink-muted">
        {number}.
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-body font-semibold break-words text-ink">
          {question.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
          <span>{typeLabel[question.type]}</span>
          {question.isRequired && (
            <span className="font-semibold text-ink">Obligatoria</span>
          )}
        </p>
        {question.options && question.options.length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink marker:text-ink-muted">
            {question.options.map((option) => (
              <li key={option.id} className="break-words">
                {option.content}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// "Respuestas": the answers table and the side sheet with one answer.
function AnswersTab({ survey }: { survey: Survey }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Answer | null>(null);

  const { data, isPending, isError, isFetching, refetch } =
    useGetAllSurveyAnswers(survey.slug, {
      query: { queryKey: getGetAllSurveyAnswersQueryKey(survey.slug) },
    });

  const deleteAnswer = useDeleteSurveyAnswerById({
    mutation: {
      onSuccess() {
        refetch();
        // The list and the active-survey statistics count answers.
        queryClient.invalidateQueries({
          queryKey: getGetAllSurveysQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetActiveSurveyStatsQueryKey(),
        });
        toast.success("Respuesta eliminada");
        setSelected(null);
      },
      onError(err) {
        toast.error(err.detail || "Error al eliminar la respuesta");
      },
    },
  });

  if (isPending) {
    return <SkeletonRules label="Cargando respuestas..." widths={Array(5).fill("100%")} />;
  }

  if (isError) {
    return (
      <ErrorState onRetry={() => refetch()} retrying={isFetching}>
        Error al cargar las respuestas
      </ErrorState>
    );
  }

  const answers = data.data;
  if (answers.length === 0) {
    return (
      <EmptyState>No hay respuestas enviadas aún para esta encuesta.</EmptyState>
    );
  }

  const columns: ColumnDef<Answer>[] = [
    {
      id: "id",
      header: "ID de respuesta",
      cell: ({ row }) => (
        <span className="figures">{row.original.id.slice(0, 8)}</span>
      ),
    },
    {
      id: "createdAt",
      header: "Fecha de envío",
      meta: { numeric: true },
      cell: ({ row }) => dateTime(row.original.createdAt),
    },
    {
      id: "originIp",
      header: "Dirección IP",
      cell: ({ row }) => (
        <span className="figures">{row.original.originIp}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { actions: true },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(row.original)}
        >
          <Eye aria-hidden="true" />
          <span>Ver respuestas</span>
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={answers} />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" closeLabel="Cerrar detalle">
          <SheetHeader className="border-b border-rule pr-14">
            <SheetTitle className="text-h3">Detalle de respuesta</SheetTitle>
            <SheetDescription className="figures break-all">
              ID: {selected?.id}
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <>
              <p className="figures flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 pt-4 text-small text-ink-muted">
                <span>IP: {selected.originIp}</span>
                <span>{dateTime(selected.createdAt)}</span>
              </p>
              <dl className="flex flex-col px-4">
                {survey.questions.map((question, idx) => {
                  const text = responseText(question, selected);
                  return (
                    <div
                      key={question.id}
                      className="flex flex-col gap-1 border-rule py-4 not-first:border-t"
                    >
                      <dt className="text-body font-semibold break-words text-ink">
                        <span className="figures text-ink-muted">{idx + 1}.</span>{" "}
                        {question.name}
                      </dt>
                      <dd
                        className={
                          text === undefined
                            ? "text-body text-ink-muted"
                            : "text-body break-words whitespace-pre-wrap text-ink"
                        }
                      >
                        {text ?? "Sin responder"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <SheetFooter className="border-t border-rule sm:flex-row sm:justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={deleteAnswer.isPending}>
                      <Trash2 aria-hidden="true" />
                      <span>Eliminar respuesta</span>
                    </Button>
                  </DialogTrigger>
                  <ConfirmationDialog
                    confirmText="Eliminar"
                    description="¿Seguro que deseas eliminar esta respuesta?"
                    onConfirm={() =>
                      deleteAnswer.mutate({ slug: survey.slug, id: selected.id })
                    }
                    isPending={deleteAnswer.isPending}
                  />
                </Dialog>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// The response to `question` as text: the written text, or the contents of
// the chosen options. `undefined` when the question was not answered.
function responseText(
  question: SurveyQuestionsItem,
  answer: Answer,
): string | undefined {
  const response = answer.responses.find((r) => r.id === question.id);
  if (!response) return undefined;
  if (question.type === "TEXT_ANSWER") return String(response.content);
  const ids = Array.isArray(response.content) ? response.content : [];
  const contents = (question.options ?? [])
    .filter((option) => ids.includes(option.id))
    .map((option) => option.content);
  return contents.length > 0 ? contents.join(", ") : "Opción no encontrada";
}
