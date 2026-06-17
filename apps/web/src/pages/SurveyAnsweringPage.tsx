import { useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import {
  useGetSurveyBySlug,
  getGetSurveyBySlugQueryKey,
} from "@/lib/api/surveys/surveys";
import { useCreateSurveyAnswer } from "@/lib/api/answers/answers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Survey } from "@/lib/api/surveySystemAPI.schemas";

interface SurveyFormValues {
  answers: Record<string, string | number[]>;
}

export default function SurveyAnsweringPage() {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: rawData,
    isLoading,
    isError,
  } = useGetSurveyBySlug(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: getGetSurveyBySlugQueryKey(slug || ""),
    },
  });

  const survey = (rawData as any)?.data as Survey | undefined;

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<SurveyFormValues>({
    defaultValues: {
      answers: {},
    },
  });

  const submitAnswer = useCreateSurveyAnswer();

  const onSubmit = (data: SurveyFormValues) => {
    if (!survey) return;

    // Convert form answers object to the responses array required by backend
    const responses = Object.entries(data.answers)
      .filter(([_, content]) => {
        // filter out empty/null responses
        if (content === undefined || content === null || content === "")
          return false;
        if (Array.isArray(content) && content.length === 0) return false;
        return true;
      })
      .map(([key, content]) => {
        const questionId = parseInt(key.replace("Q", ""), 10);
        return {
          id: questionId,
          content: content as any,
        };
      });

    // Check if all required questions are answered
    const requiredQuestionIds = survey.questions
      .filter((q) => q.isRequired)
      .map((q) => q.id);

    const answeredQuestionIds = responses.map((r) => r.id);
    const missingRequired = requiredQuestionIds.filter(
      (id) => !answeredQuestionIds.includes(id),
    );

    if (missingRequired.length > 0) {
      toast.error("Por favor, responde todas las preguntas obligatorias.");
      return;
    }

    submitAnswer.mutate(
      {
        slug: survey.slug,
        data: { responses },
      },
      {
        onSuccess() {
          toast.success("Respuestas enviadas correctamente");
        },
        onError(err) {
          toast.error(err.detail || "Error al enviar las respuestas");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center flex flex-col items-center">
            <AlertCircle className="size-12 text-destructive mb-4" />
            <CardTitle className="text-xl text-destructive">
              Encuesta no encontrada
            </CardTitle>
            <CardDescription>
              La encuesta que estás intentando acceder no existe o no está
              disponible.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitAnswer.isSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="text-center flex flex-col items-center">
            <CheckCircle2 className="size-12 text-emerald-500 mb-4" />
            <CardTitle className="text-2xl text-emerald-600 font-bold">
              ¡Muchas gracias!
            </CardTitle>
            <CardDescription className="text-emerald-700/80">
              Tus respuestas a la encuesta <strong>{survey.name}</strong> han
              sido enviadas correctamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur shadow-xl">
        <CardHeader className="border-b border-border/40 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {survey.name}
          </CardTitle>
          <CardDescription>
            Por favor, responde las siguientes preguntas. Los campos marcados
            con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {survey.questions.map((question) => {
              const fieldName = `answers.Q${question.id}`;
              const hasError = errors.answers?.[`Q${question.id}`];

              return (
                <div
                  key={question.id}
                  className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/20"
                >
                  <div className="flex justify-between items-start">
                    <Label className="text-sm font-semibold text-foreground">
                      {question.name}{" "}
                      {question.isRequired && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <span className="text-[10px] bg-primary/10 text-primary-foreground/85 border border-primary/20 px-2 py-0.5 rounded font-medium">
                      {question.type === "TEXT_ANSWER" && "Texto"}
                      {question.type === "SINGLE_SELECT" && "Única opción"}
                      {question.type === "MULTI_SELECT" && "Múltiple opción"}
                    </span>
                  </div>

                  {/* TEXT ANSWER */}
                  {question.type === "TEXT_ANSWER" && (
                    <div className="space-y-1">
                      <Textarea
                        placeholder="Escribe tu respuesta aquí..."
                        className="bg-background/80"
                        {...register(fieldName as any, {
                          required: question.isRequired
                            ? "Esta pregunta es obligatoria"
                            : false,
                        })}
                      />
                      {hasError && (
                        <p className="text-xs text-destructive mt-1">
                          {hasError.message as string}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SINGLE SELECT */}
                  {question.type === "SINGLE_SELECT" && (
                    <div className="space-y-1">
                      <Controller
                        name={fieldName as any}
                        control={control}
                        rules={{
                          required: question.isRequired
                            ? "Esta pregunta es obligatoria"
                            : false,
                        }}
                        render={({ field }) => (
                          <RadioGroup
                            value={
                              field.value
                                ? String((field.value as number[])[0])
                                : ""
                            }
                            onValueChange={(val) =>
                              field.onChange([parseInt(val, 10)])
                            }
                            className="flex flex-col gap-2 pt-2"
                          >
                            {question.options?.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem
                                  value={String(option.id)}
                                  id={`q${question.id}-o${option.id}`}
                                  className="cursor-pointer"
                                />
                                <Label
                                  htmlFor={`q${question.id}-o${option.id}`}
                                  className="text-xs font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {option.content}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      />
                      {hasError && (
                        <p className="text-xs text-destructive mt-1">
                          {hasError.message as string}
                        </p>
                      )}
                    </div>
                  )}

                  {/* MULTI SELECT */}
                  {question.type === "MULTI_SELECT" && (
                    <div className="space-y-1">
                      <Controller
                        name={fieldName as any}
                        control={control}
                        rules={{
                          validate: (val) => {
                            if (
                              question.isRequired &&
                              (!val || (val as number[]).length === 0)
                            ) {
                              return "Debes seleccionar al menos una opción";
                            }
                            return true;
                          },
                        }}
                        render={({ field }) => {
                          const selected = (field.value as number[]) || [];
                          return (
                            <div className="flex flex-col gap-2 pt-2">
                              {question.options?.map((option) => (
                                <div
                                  key={option.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    checked={selected.includes(option.id)}
                                    className="cursor-pointer"
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([
                                          ...selected,
                                          option.id,
                                        ]);
                                      } else {
                                        field.onChange(
                                          selected.filter(
                                            (id) => id !== option.id,
                                          ),
                                        );
                                      }
                                    }}
                                    id={`q${question.id}-o${option.id}`}
                                  />
                                  <Label
                                    htmlFor={`q${question.id}-o${option.id}`}
                                    className="text-xs font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {option.content}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      {hasError && (
                        <p className="text-xs text-destructive mt-1">
                          {hasError.message as string}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={submitAnswer.isPending}
            >
              {submitAnswer.isPending ? "Enviando..." : "Enviar respuestas"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
