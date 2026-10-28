import { useEffect, useRef, type ReactNode } from "react";
import { useParams } from "react-router";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { toast } from "sonner";
import {
  getGetSurveyBySlugQueryKey,
  useGetSurveyBySlug,
} from "@/lib/api/surveys/surveys";
import { useCreateSurveyAnswer } from "@/lib/api/answers/answers";
import type {
  CreateSurveyAnswerBodyResponsesItem,
  SurveyQuestionsItem,
} from "@/lib/api/sondixAPI.schemas";
import { GUTTERS } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Logo from "@/components/Logo";
import RequiredMark from "@/components/RequiredMark";

// Public answering page `/surveys/:slug` (REQ-FE-023, REQ-FE-024): a
// questionnaire sheet in one reading column (REQ-FE-034).

const REQUIRED_MESSAGE = "Esta pregunta es obligatoria";

type ResponseValue = CreateSurveyAnswerBodyResponsesItem["content"];

interface SurveyFormValues {
  answers: Record<string, ResponseValue>;
}

const answerKey = (questionId: number) => `Q${questionId}`;

// An empty text ("") or an empty selection ([]) counts as unanswered.
const isAnswered = (value: ResponseValue | undefined) =>
  value !== undefined && value.length > 0;

// Full-width option row (at least 44 px tall): the label wraps the control,
// so the whole row toggles it.
const OPTION_ROW =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-body-lg text-ink transition-colors duration-150 ease-out hover:bg-surface-subtle has-data-[state=checked]:bg-teal-tint has-data-[state=checked]:hover:bg-teal-tint";

// The sheet: one centered column on paper, at most 42 rem wide, with the
// logo at its foot. No top bar, card or tinted ground.
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn("flex min-h-dvh w-full justify-center bg-paper", GUTTERS)}
    >
      <div className="flex w-full max-w-168 flex-col pt-12 pb-10">
        <main className="flex-1">{children}</main>
        <footer className="mt-16">
          <Logo variant="footer" />
        </footer>
      </div>
    </div>
  );
}

function StrongRule({ className }: { className?: string }) {
  return (
    <hr className={cn("border-0 border-t-2 border-rule-strong", className)} />
  );
}

// "{answered} de {n} respondidas" with a slim teal bar on a rule track.
function Progress({
  answered,
  total,
  className,
}: {
  answered: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? (answered / total) * 100 : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <p className="figures text-small text-ink">
        {answered} de {total} respondidas
      </p>
      <div aria-hidden="true" className="h-0.5 w-full bg-rule">
        <div className="h-full bg-teal" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Skeleton rules in the shape of the header and two questions.
function SheetSkeleton() {
  return (
    <div role="status" aria-label="Cargando encuesta...">
      <Skeleton className="w-3/4" />
      <Skeleton className="mt-5 w-1/2" />
      <StrongRule className="mt-6" />
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-4 py-8",
            i > 0 && "border-t border-rule",
          )}
        >
          <Skeleton className="w-2/3" />
          <Skeleton className="mt-2 w-full" />
          <Skeleton className="w-full" />
          <Skeleton className="w-5/6" />
        </div>
      ))}
    </div>
  );
}

export default function SurveyAnsweringPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const thanksHeading = useRef<HTMLHeadingElement>(null);

  const { data, isLoading, isError } = useGetSurveyBySlug(slug, {
    query: { enabled: !!slug, queryKey: getGetSurveyBySlugQueryKey(slug) },
  });
  const survey = data?.data;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SurveyFormValues>({
    defaultValues: { answers: {} },
    shouldFocusError: false,
  });
  const answers = useWatch({ control, name: "answers" });

  const submitAnswer = useCreateSurveyAnswer({
    mutation: {
      onError(error) {
        toast.error(error.detail);
      },
    },
  });

  // The thank-you heading takes the focus once the answers are sent.
  useEffect(() => {
    if (submitAnswer.isSuccess) thanksHeading.current?.focus();
  }, [submitAnswer.isSuccess]);

  if (isLoading) {
    return (
      <Sheet>
        <SheetSkeleton />
      </Sheet>
    );
  }

  // Missing and inactive surveys look the same (REQ-FE-024).
  if (isError || !survey) {
    return (
      <Sheet>
        <h1 className="text-h1">Encuesta no encontrada</h1>
        <p className="mt-3 text-body-lg text-ink-muted">
          La encuesta que estás intentando acceder no existe o no está
          disponible.
        </p>
      </Sheet>
    );
  }

  if (submitAnswer.isSuccess) {
    return (
      <Sheet>
        <p className="text-h1 text-balance">{survey.name}</p>
        <StrongRule className="mt-6 mb-8" />
        <h1 ref={thanksHeading} tabIndex={-1} className="text-h2">
          ¡Muchas gracias!
        </h1>
        <p className="mt-3 text-body-lg text-ink">
          Tus respuestas a la encuesta {survey.name} han sido enviadas
          correctamente.
        </p>
      </Sheet>
    );
  }

  const { questions } = survey;
  const total = questions.length;
  const answered = questions.filter((q) =>
    isAnswered(answers?.[answerKey(q.id)]),
  ).length;

  const onValid = (values: SurveyFormValues) => {
    const responses = questions
      .map((q) => ({ id: q.id, content: values.answers[answerKey(q.id)] }))
      .filter((r): r is CreateSurveyAnswerBodyResponsesItem =>
        isAnswered(r.content),
      );
    submitAnswer.mutate({ slug: survey.slug, data: { responses } });
  };

  // Focus the first control of the first unanswered required question.
  const onInvalid = (formErrors: FieldErrors<SurveyFormValues>) => {
    const first = questions.find((q) => formErrors.answers?.[answerKey(q.id)]);
    if (!first) return;
    document
      .getElementById(`${answerKey(first.id)}-fieldset`)
      ?.querySelector<HTMLElement>("textarea, [role=radio], [role=checkbox]")
      ?.focus();
  };

  const requiredRule = (question: SurveyQuestionsItem) => ({
    validate: (value: ResponseValue | undefined) =>
      !question.isRequired || isAnswered(value) || REQUIRED_MESSAGE,
  });

  return (
    <Sheet>
      <header>
        <h1 className="text-h1">{survey.name}</h1>
        <p className="mt-2 text-small text-ink-muted">
          {total === 1 ? "1 pregunta" : `${total} preguntas`} · Las marcadas con
          * son obligatorias.
        </p>
        <StrongRule className="mt-6" />
      </header>

      <form noValidate onSubmit={handleSubmit(onValid, onInvalid)}>
        <Progress
          answered={answered}
          total={total}
          className="sticky top-0 z-10 -mx-4 border-b border-rule bg-paper px-4 py-2.5 md:hidden"
        />

        <div className="divide-y divide-rule">
          {questions.map((question, index) => {
            const key = answerKey(question.id);
            const name = `answers.${key}` as const;
            const legendId = `${key}-legend`;
            const errorId = `${key}-error`;
            const error = errors.answers?.[key];

            return (
              <div key={question.id} className="py-8">
                <fieldset
                  id={`${key}-fieldset`}
                  className="relative min-w-0"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                >
                  <legend
                    id={legendId}
                    className="flex w-full gap-3 text-h3 text-ink"
                  >
                    <span className="figures shrink-0 text-ink-muted lg:absolute lg:top-0 lg:-left-12 lg:w-8 lg:text-right">
                      {index + 1}
                    </span>{" "}
                    <span className="min-w-0 text-balance wrap-anywhere">
                      {question.name}
                      {question.isRequired && (
                        <>
                          {" "}
                          <RequiredMark />
                          <span className="sr-only"> (obligatoria)</span>
                        </>
                      )}
                    </span>
                  </legend>

                  {question.type === "TEXT_ANSWER" && (
                    <Textarea
                      rows={4}
                      placeholder="Escribe tu respuesta aquí..."
                      aria-labelledby={legendId}
                      aria-required={question.isRequired || undefined}
                      aria-invalid={error ? true : undefined}
                      className="mt-4 min-h-28 text-body-lg"
                      {...register(name, requiredRule(question))}
                    />
                  )}

                  {question.type === "SINGLE_SELECT" && (
                    <Controller
                      name={name}
                      control={control}
                      rules={requiredRule(question)}
                      render={({ field }) => (
                        <RadioGroup
                          aria-labelledby={legendId}
                          aria-required={question.isRequired || undefined}
                          value={
                            Array.isArray(field.value) && field.value.length > 0
                              ? String(field.value[0])
                              : ""
                          }
                          onValueChange={(value) =>
                            field.onChange([Number(value)])
                          }
                          className="mt-4 gap-0.5"
                        >
                          {question.options?.map((option) => (
                            <label key={option.id} className={OPTION_ROW}>
                              <RadioGroupItem value={String(option.id)} />
                              <span className="min-w-0 wrap-anywhere">
                                {option.content}
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  )}

                  {question.type === "MULTI_SELECT" && (
                    <Controller
                      name={name}
                      control={control}
                      rules={requiredRule(question)}
                      render={({ field }) => {
                        const selected = Array.isArray(field.value)
                          ? field.value
                          : [];
                        return (
                          <div className="mt-4 flex flex-col gap-0.5">
                            {question.options?.map((option) => (
                              <label key={option.id} className={OPTION_ROW}>
                                <Checkbox
                                  checked={selected.includes(option.id)}
                                  onCheckedChange={(checked) =>
                                    field.onChange(
                                      checked === true
                                        ? [...selected, option.id]
                                        : selected.filter(
                                            (id) => id !== option.id,
                                          ),
                                    )
                                  }
                                />
                                <span className="min-w-0 wrap-anywhere">
                                  {option.content}
                                </span>
                              </label>
                            ))}
                          </div>
                        );
                      }}
                    />
                  )}

                  {error && (
                    <FieldError id={errorId} className="mt-3">
                      {error.message}
                    </FieldError>
                  )}
                </fieldset>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 border-t border-rule pt-8 md:flex-row md:items-center md:justify-between">
          <Progress
            answered={answered}
            total={total}
            className="hidden w-48 md:flex"
          />
          <Button
            type="submit"
            loading={submitAnswer.isPending}
            className="w-full md:w-auto"
          >
            {submitAnswer.isPending ? "Enviando..." : "Enviar respuestas"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
