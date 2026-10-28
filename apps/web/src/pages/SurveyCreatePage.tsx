import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import type { Control, FieldError as FormFieldError } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CircleAlert, Plus, Trash2 } from "lucide-react";
import { QUESTION_NAME_MIN, SURVEY_NAME_MIN } from "@survey-system/schemas";
import {
  useCreateSurvey,
  getGetAllSurveysQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  getGetActiveSurveyStatsQueryKey,
  getGetSurveySummaryQueryKey,
} from "@/lib/api/stats/stats";
import type {
  CreateSurvey,
  CreateSurveyQuestionsItem,
} from "@/lib/api/sondixAPI.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import RequiredMark from "@/components/RequiredMark";
import { invalidProps } from "@/lib/form";
import { EmptyState } from "@/components/DataStates";

interface OptionValue {
  content: string;
}

interface QuestionValue {
  name: string;
  type: "TEXT_ANSWER" | "SINGLE_SELECT" | "MULTI_SELECT";
  isRequired: boolean;
  options?: OptionValue[];
}

interface CreateSurveyFormValues {
  name: string;
  questions: QuestionValue[];
}

const isSelect = (type: QuestionValue["type"]) =>
  type === "SINGLE_SELECT" || type === "MULTI_SELECT";

interface QuestionOptionsProps {
  control: Control<CreateSurveyFormValues>;
  questionIndex: number;
  /** The client-side error of an option's content, if any. */
  optionError: (optionIndex: number) => FormFieldError | undefined;
}

function QuestionOptionsFields({
  control,
  questionIndex,
  optionError,
}: QuestionOptionsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-body font-semibold text-ink">
        Opciones de respuesta
      </legend>

      {fields.length === 0 && (
        <p className="flex items-center gap-1.5 text-caption text-rust">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          Debes añadir al menos una opción para esta pregunta.
        </p>
      )}

      {fields.length > 0 && (
        <ol className="flex flex-col gap-3">
          {fields.map((field, optionIndex) => {
            const id = `q-${questionIndex}-option-${optionIndex}`;
            const error = optionError(optionIndex);
            return (
              <li
                key={field.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1"
              >
                <Label
                  htmlFor={id}
                  className="figures justify-end font-normal text-ink-muted"
                >
                  <span className="sr-only">Opción </span>
                  {optionIndex + 1}
                </Label>
                <Input
                  id={id}
                  placeholder={`Opción ${optionIndex + 1}`}
                  {...invalidProps(error, `${id}-error`)}
                  {...control.register(
                    `questions.${questionIndex}.options.${optionIndex}.content` as const,
                    { required: "El contenido de la opción es obligatorio" },
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(optionIndex)}
                  aria-label="Eliminar opción"
                  className="text-ink-muted not-disabled:hover:text-rust"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
                {error && (
                  <FieldError id={`${id}-error`} className="col-start-2">
                    {error.message}
                  </FieldError>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ content: "" })}
        className="w-fit"
      >
        <Plus aria-hidden="true" />
        <span>Añadir opción</span>
      </Button>
    </fieldset>
  );
}

// Create survey (REQ-FE-019): general fields, then the questions as a
// numbered list of ruled sections. Ids are numbered from 1 on submit.
export default function SurveyCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createSurvey = useCreateSurvey();

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<CreateSurveyFormValues>({
    defaultValues: {
      name: "",
      questions: [{ name: "", type: "TEXT_ANSWER", isRequired: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });
  const questionTypes = useWatch({ control, name: "questions" });

  const onSubmit = (values: CreateSurveyFormValues) => {
    // Question ids and, within each question, option ids from 1, in order.
    const questions = values.questions.map(
      (q, qIdx): CreateSurveyQuestionsItem => ({
        id: qIdx + 1,
        name: q.name,
        type: q.type,
        isRequired: q.isRequired,
        ...(isSelect(q.type) && {
          options: (q.options ?? []).map((o, oIdx) => ({
            id: oIdx + 1,
            content: o.content,
          })),
        }),
      }),
    );
    const payload: CreateSurvey = { name: values.name, questions };

    createSurvey.mutate(
      { data: payload },
      {
        onSuccess() {
          for (const queryKey of [
            getGetAllSurveysQueryKey(),
            getGetSurveySummaryQueryKey(),
            getGetActiveSurveyStatsQueryKey(),
          ]) {
            queryClient.invalidateQueries({ queryKey });
          }
          toast.success("Encuesta creada correctamente");
          navigate("/dashboard");
        },
        onError(err) {
          toast.error(err.detail || "Error al crear la encuesta");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-4">
        <Link
          to="/dashboard"
          className="inline-flex w-fit items-center gap-2 text-body text-ink-muted transition-colors duration-150 ease-out hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver a encuestas
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-balance">Nueva encuesta</h1>
          <p className="text-small text-ink-muted">
            Diseña tu encuesta añadiendo preguntas y opciones.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex max-w-3xl flex-col gap-10"
      >
        <section aria-labelledby="general" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="general" className="text-h2 text-balance">
              Configuración General
            </h2>
            <p className="text-small text-ink-muted">
              Establece el nombre general de la encuesta.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="survey-name">
              Nombre de la Encuesta <RequiredMark />
            </Label>
            <Input
              id="survey-name"
              aria-required="true"
              placeholder="Ej. Encuesta de Clima Laboral"
              {...invalidProps(errors.name, "survey-name-error")}
              {...register("name", {
                required: "El nombre de la encuesta es obligatorio",
                minLength: {
                  value: SURVEY_NAME_MIN,
                  message: `Debe tener al menos ${SURVEY_NAME_MIN} caracteres`,
                },
              })}
            />
            {errors.name && (
              <FieldError id="survey-name-error">{errors.name.message}</FieldError>
            )}
          </div>
        </section>

        <section aria-labelledby="questions" className="flex flex-col gap-4">
          <h2 id="questions" className="text-h2 text-balance">
            Preguntas
          </h2>

          {fields.length === 0 ? (
            <EmptyState className="border-y border-rule-strong py-3">
              No hay preguntas creadas. Haz clic en "Añadir pregunta" para
              comenzar.
            </EmptyState>
          ) : (
            <ol className="border-y border-rule-strong">
              {fields.map((field, index) => {
                const nameId = `q-${index}-name`;
                const nameError = errors.questions?.[index]?.name;
                const type = questionTypes?.[index]?.type ?? "TEXT_ANSWER";
                return (
                  <li
                    key={field.id}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-rule py-6 not-first:border-t md:grid-cols-[2.5rem_minmax(0,1fr)]"
                  >
                    <span
                      aria-hidden="true"
                      className="figures pt-px text-h3 text-ink-muted"
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-end justify-between gap-2">
                          <Label htmlFor={nameId}>
                            Pregunta
                            <span className="sr-only"> #{index + 1}</span>{" "}
                            <RequiredMark />
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            aria-label="Eliminar pregunta"
                            className="-my-2 text-ink-muted not-disabled:hover:text-rust"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <Input
                          id={nameId}
                          aria-required="true"
                          placeholder="Ej. ¿Qué opinas sobre el nuevo horario de trabajo?"
                          {...invalidProps(nameError, `${nameId}-error`)}
                          {...register(`questions.${index}.name` as const, {
                            required: "La pregunta es obligatoria",
                            minLength: {
                              value: QUESTION_NAME_MIN,
                              message: `Debe tener al menos ${QUESTION_NAME_MIN} caracteres`,
                            },
                          })}
                        />
                        {nameError && (
                          <FieldError id={`${nameId}-error`}>
                            {nameError.message}
                          </FieldError>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-end">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`q-${index}-type`}>Tipo de Pregunta</Label>
                          <select
                            id={`q-${index}-type`}
                            className="h-11 w-full rounded-control border border-input-border bg-paper px-3 py-1 text-body text-ink transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 md:h-10"
                            {...register(`questions.${index}.type` as const)}
                          >
                            <option value="TEXT_ANSWER">Respuesta de Texto</option>
                            <option value="SINGLE_SELECT">Selección Única</option>
                            <option value="MULTI_SELECT">Selección Múltiple</option>
                          </select>
                        </div>

                        <div className="flex h-11 items-center gap-3 md:h-10">
                          <Controller
                            name={`questions.${index}.isRequired` as const}
                            control={control}
                            render={({ field: checkbox }) => (
                              <Checkbox
                                id={`q-${index}-required`}
                                checked={checkbox.value}
                                onCheckedChange={checkbox.onChange}
                                className="cursor-pointer"
                              />
                            )}
                          />
                          <Label
                            htmlFor={`q-${index}-required`}
                            className="cursor-pointer font-normal"
                          >
                            Pregunta obligatoria (requerida)
                          </Label>
                        </div>
                      </div>

                      {isSelect(type) && (
                        <QuestionOptionsFields
                          control={control}
                          questionIndex={index}
                          optionError={(i) =>
                            errors.questions?.[index]?.options?.[i]?.content
                          }
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ name: "", type: "TEXT_ANSWER", isRequired: false })
            }
            className="w-fit max-md:w-full"
          >
            <Plus aria-hidden="true" />
            <span>Añadir pregunta</span>
          </Button>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-rule-strong pt-6 md:flex-row md:justify-end">
          <Button variant="outline" asChild>
            <Link to="/dashboard">Cancelar</Link>
          </Button>
          <Button type="submit" loading={createSurvey.isPending}>
            {createSurvey.isPending ? "Creando..." : "Crear encuesta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
