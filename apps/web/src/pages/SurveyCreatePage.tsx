import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import {
  useCreateSurvey,
  getGetAllSurveysQueryKey,
} from "@/lib/api/surveys/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash, Plus, ArrowLeft } from "lucide-react";

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

interface QuestionOptionsProps {
  control: Control<CreateSurveyFormValues>;
  questionIndex: number;
}

function QuestionOptionsFields({
  control,
  questionIndex,
}: QuestionOptionsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="space-y-3 pl-4 border-l-2 border-border/80 ml-2 mt-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Opciones de respuesta
        </Label>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => append({ content: "" })}
          className="text-[10px] h-6 cursor-pointer gap-1"
        >
          <Plus className="size-3" />
          <span>Añadir opción</span>
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-destructive">
          Debes añadir al menos una opción para esta pregunta.
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, optionIndex) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              placeholder={`Opción ${optionIndex + 1}`}
              className="h-8 text-xs bg-background/80"
              {...control.register(
                `questions.${questionIndex}.options.${optionIndex}.content` as const,
                { required: "El contenido de la opción es obligatorio" },
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => remove(optionIndex)}
              className="text-destructive hover:bg-destructive/10 h-8 w-8 cursor-pointer shrink-0"
            >
              <Trash className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SurveyCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createSurvey = useCreateSurvey();

  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm<CreateSurveyFormValues>({
    defaultValues: {
      name: "",
      questions: [
        {
          name: "",
          type: "TEXT_ANSWER",
          isRequired: false,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const onSubmit = (values: CreateSurveyFormValues) => {
    // Format payload to index IDs sequentially (starting from 1)
    const formattedQuestions = values.questions.map((q, qIdx) => {
      const questionId = qIdx + 1;
      const formattedQ: any = {
        id: questionId,
        name: q.name,
        type: q.type,
        isRequired: q.isRequired,
      };

      if (q.type === "SINGLE_SELECT" || q.type === "MULTI_SELECT") {
        formattedQ.options = (q.options || []).map((o, oIdx) => ({
          id: oIdx + 1,
          content: o.content,
        }));
      }

      return formattedQ;
    });

    const payload = {
      name: values.name,
      questions: formattedQuestions,
    };

    createSurvey.mutate(
      { data: payload },
      {
        onSuccess() {
          queryClient.invalidateQueries({
            queryKey: getGetAllSurveysQueryKey(),
          });
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate("/dashboard")}
          className="cursor-pointer"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Encuesta</h1>
          <p className="text-sm text-muted-foreground">
            Diseña tu encuesta añadiendo preguntas y opciones.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-border/60 bg-card/60 backdrop-blur shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Configuración General</CardTitle>
            <CardDescription>
              Establece el nombre general de la encuesta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="survey-name">Nombre de la Encuesta</Label>
              <Input
                id="survey-name"
                placeholder="Ej. Encuesta de Clima Laboral"
                {...register("name", {
                  required: "El nombre de la encuesta es obligatorio",
                  minLength: {
                    value: 5,
                    message: "Debe tener al menos 5 caracteres",
                  },
                })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Preguntas</h2>
            <Button
              type="button"
              onClick={() =>
                append({ name: "", type: "TEXT_ANSWER", isRequired: false })
              }
              className="cursor-pointer gap-1.5"
            >
              <Plus className="size-4" />
              <span>Añadir pregunta</span>
            </Button>
          </div>

          {fields.length === 0 && (
            <Card className="p-6 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                No hay preguntas creadas. Haz clic en "Añadir pregunta" para
                comenzar.
              </p>
            </Card>
          )}

          <div className="space-y-6">
            {fields.map((field, index) => {
              const questionType = watch(`questions.${index}.type`);

              return (
                <Card
                  key={field.id}
                  className="border-border/60 bg-card/60 backdrop-blur shadow-sm relative"
                >
                  <div className="absolute right-4 top-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8"
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>

                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label>Pregunta #{index + 1}</Label>
                        <Input
                          placeholder="Ej. ¿Qué opinas sobre el nuevo horario de trabajo?"
                          {...register(`questions.${index}.name` as const, {
                            required: "La pregunta es obligatoria",
                            minLength: {
                              value: 5,
                              message: "Debe tener al menos 5 caracteres",
                            },
                          })}
                        />
                        {errors.questions?.[index]?.name && (
                          <p className="text-xs text-destructive">
                            {errors.questions[index]?.name?.message}
                          </p>
                        )}
                      </div>

                      {/* Type Selection */}
                      <div className="space-y-1.5">
                        <Label>Tipo de Pregunta</Label>
                        <select
                          className="flex h-8 w-full border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 rounded-none bg-background/50 border-border/80 focus:border-primary outline-hidden"
                          {...register(`questions.${index}.type` as const)}
                        >
                          <option value="TEXT_ANSWER">
                            Respuesta de Texto
                          </option>
                          <option value="SINGLE_SELECT">Selección Única</option>
                          <option value="MULTI_SELECT">
                            Selección Múltiple
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Required Checkbox */}
                    <div className="flex items-center space-x-2 pt-1">
                      <Controller
                        name={`questions.${index}.isRequired` as const}
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id={`q-${index}-required`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="cursor-pointer"
                          />
                        )}
                      />
                      <Label
                        htmlFor={`q-${index}-required`}
                        className="text-xs font-normal cursor-pointer select-none"
                      >
                        Pregunta obligatoria (requerida)
                      </Label>
                    </div>

                    {/* Options (Conditional on type selection) */}
                    {(questionType === "SINGLE_SELECT" ||
                      questionType === "MULTI_SELECT") && (
                      <QuestionOptionsFields
                        control={control}
                        questionIndex={index}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={createSurvey.isPending}
          >
            {createSurvey.isPending ? "Creando..." : "Crear encuesta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
