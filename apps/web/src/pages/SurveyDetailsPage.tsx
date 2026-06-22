import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useGetSurveyBySlug,
  useGetSurveyStatsBySlug,
  useUpdateSurveyBySlug,
  useDeleteSurveyBySlug,
  getGetAllSurveysQueryKey,
  getGetSurveyBySlugQueryKey,
  getGetSurveyStatsBySlugQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  useGetAllSurveyAnswers,
  useDeleteSurveyAnswerById,
  getGetAllSurveyAnswersQueryKey,
} from "@/lib/api/answers/answers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Eye,
  BarChart3,
  ListCollapse,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Survey, SurveyStats } from "@/lib/api/surveySystemAPI.schemas";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AnswerItem {
  id: string;
  createdAt: string;
  originIp: string;
  responses: Array<{
    id: number;
    content: string | number[];
  }>;
}

export default function SurveyDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerItem | null>(null);

  // Queries
  const {
    data: surveyData,
    isLoading: isSurveyLoading,
    isError: isSurveyError,
  } = useGetSurveyBySlug(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: getGetSurveyBySlugQueryKey(slug || ""),
    },
  });

  const { data: statsData, isLoading: isStatsLoading } =
    useGetSurveyStatsBySlug(slug || "", {
      query: {
        enabled: !!slug && activeTab === "stats",
        queryKey: getGetSurveyStatsBySlugQueryKey(slug || ""),
      },
    });

  const {
    data: answersData,
    isLoading: isAnswersLoading,
    refetch: refetchAnswers,
  } = useGetAllSurveyAnswers(slug || "", {
    query: {
      enabled: !!slug && activeTab === "answers",
      queryKey: getGetAllSurveyAnswersQueryKey(slug || ""),
    },
  });

  const survey = (surveyData as any)?.data as Survey | undefined;
  const stats = (statsData as any)?.data as SurveyStats | undefined;
  const answers = (answersData as any)?.data as AnswerItem[] | undefined;

  // Mutations
  const updateSurvey = useUpdateSurveyBySlug({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: [`http://localhost:3000/api/v1/surveys/${slug}`],
        });
        queryClient.invalidateQueries({
          queryKey: getGetAllSurveysQueryKey(),
        });
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
        queryClient.invalidateQueries({
          queryKey: getGetAllSurveysQueryKey(),
        });
        toast.success("Encuesta eliminada correctamente");
        navigate("/dashboard");
      },
      onError(err) {
        toast.error(err.detail || "Error al eliminar la encuesta");
      },
    },
  });

  const deleteAnswer = useDeleteSurveyAnswerById({
    mutation: {
      onSuccess() {
        refetchAnswers();
        toast.success("Respuesta eliminada");
        setSelectedAnswer(null);
      },
      onError(err) {
        toast.error(err.detail || "Error al eliminar la respuesta");
      },
    },
  });

  const handleToggleActive = () => {
    if (!survey) return;
    updateSurvey.mutate({
      slug: survey.slug,
      data: { isActive: !survey.isActive },
    });
  };

  const handleDeleteSurvey = () => {
    if (!survey) return;
    deleteSurvey.mutate({ slug: survey.slug });
  };

  const handleCopyLink = () => {
    if (!survey) return;
    const shareUrl = `${window.location.origin}/surveys/${survey.slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (isSurveyLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isSurveyError || !survey) {
    return (
      <div className="p-6">
        <Card className="border-destructive/20 bg-destructive/5 text-center p-8">
          <CardTitle className="text-destructive">
            Error al cargar detalles
          </CardTitle>
          <CardDescription className="mt-2">
            No pudimos encontrar la encuesta seleccionada.
          </CardDescription>
          <Button
            onClick={() => navigate("/dashboard")}
            className="mt-4 cursor-pointer"
          >
            Volver al panel
          </Button>
        </Card>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/surveys/${survey.slug}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Dialog>
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="flex gap-3 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {survey.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                slug: {survey.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleToggleActive}
              disabled={updateSurvey.isPending}
              className="cursor-pointer gap-2"
            >
              {survey.isActive ? (
                <>
                  <Lock className="size-4" />
                  <span>Desactivar</span>
                </>
              ) : (
                <>
                  <Unlock className="size-4" />
                  <span>Activar</span>
                </>
              )}
            </Button>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleteSurvey.isPending}
                className="cursor-pointer gap-2"
              >
                <Trash2 className="size-4" />
                <span>Eliminar</span>
              </Button>
            </DialogTrigger>
          </div>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirma tu acción</DialogTitle>
            <DialogDescription>{`¿Estás seguro de que deseas eliminar la encuesta "${survey.name}"?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteSurvey}>
              Eliminar
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60">
          <TabsTrigger value="overview" className="cursor-pointer gap-1.5">
            <Settings className="size-3.5" />
            <span>Detalles</span>
          </TabsTrigger>
          <TabsTrigger value="answers" className="cursor-pointer gap-1.5">
            <ListCollapse className="size-3.5" />
            <span>Respuestas</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="cursor-pointer gap-1.5">
            <BarChart3 className="size-3.5" />
            <span>Estadísticas</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Compartir Encuesta</CardTitle>
              <CardDescription>
                Copia este enlace para enviarlo a los encuestados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 p-2.5 rounded border border-border/80 text-xs font-mono select-all truncate">
                  {publicUrl}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="cursor-pointer"
                  title="Copiar enlace"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(publicUrl, "_blank")}
                  className="cursor-pointer"
                  title="Abrir enlace"
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                Preguntas de la Encuesta
              </CardTitle>
              <CardDescription>
                Esta encuesta contiene {survey.questions.length} preguntas en
                total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {survey.questions.map((question, idx) => (
                <div
                  key={question.id}
                  className="pb-4 border-b border-border/40 last:border-b-0 last:pb-0 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted p-1 px-2 rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {question.name}
                    </span>
                    {question.isRequired && (
                      <span className="text-[10px] border border-destructive/20 text-destructive bg-destructive/5 px-2 py-0.5 rounded font-medium uppercase">
                        Requerido
                      </span>
                    )}
                    <span className="text-[10px] border border-primary/20 text-primary bg-primary/5 px-2 py-0.5 rounded font-medium uppercase">
                      {question.type}
                    </span>
                  </div>

                  {(question.type === "SINGLE_SELECT" ||
                    question.type === "MULTI_SELECT") && (
                    <div className="pl-8 space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Opciones:
                      </p>
                      <ul className="list-disc list-inside pl-2 text-xs text-muted-foreground space-y-0.5">
                        {question.options?.map((o) => (
                          <li key={o.id}>{o.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANSWERS TAB */}
        <TabsContent value="answers" className="mt-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Respuestas Recibidas</CardTitle>
              <CardDescription>
                Lista de todas las participaciones registradas en esta encuesta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnswersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : !answers || answers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay respuestas enviadas aún para esta encuesta.
                </p>
              ) : (
                <div className="border border-border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID de Respuesta</TableHead>
                        <TableHead>Fecha de Envío</TableHead>
                        <TableHead>Dirección IP</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answers.map((ans) => (
                        <TableRow key={ans.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {ans.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(ans.createdAt).toLocaleString("es-CU")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {ans.originIp}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setSelectedAnswer(ans)}
                              className="cursor-pointer gap-1.5"
                            >
                              <Eye className="size-3.5" />
                              <span>Ver respuestas</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-6 mt-4">
          {isStatsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !stats ? (
            <p className="text-sm text-muted-foreground">
              No hay estadísticas disponibles.
            </p>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <Card className="py-4 px-6 border-border/60 bg-card/60 backdrop-blur shadow-xs">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Respuestas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <span className="text-3xl font-bold tracking-tight">
                      {stats.totalAnswers}
                    </span>
                  </CardContent>
                </Card>
                <Card className="py-4 px-6 border-border/60 bg-card/60 backdrop-blur shadow-xs">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Respuestas Completadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <span className="text-3xl font-bold tracking-tight text-emerald-500">
                      {stats.completedAnswers}
                    </span>
                  </CardContent>
                </Card>
                <Card className="py-4 px-6 border-border/60 bg-card/60 backdrop-blur shadow-xs">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Respuestas Incompletas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <span className="text-3xl font-bold tracking-tight text-destructive">
                      {stats.incompleteAnswers}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Option lists */}
              <div className="space-y-6">
                {stats.optionStats.map((optStat) => {
                  const chartData = optStat.options.map((opt) => ({
                    option: opt.optionContent,
                    respuestas: opt.responseCount,
                  }));

                  const chartConfig = {
                    respuestas: {
                      label: "Respuestas",
                      color: "oklch(var(--primary))",
                    },
                  };

                  return (
                    <Card
                      key={optStat.questionId}
                      className="border-border/60 bg-card/60 backdrop-blur shadow-sm"
                    >
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">
                          {optStat.questionName}
                        </CardTitle>
                        <CardDescription>
                          Frecuencia de las respuestas de los usuarios
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {chartData.length > 0 ? (
                          <ChartContainer
                            config={chartConfig}
                            className="min-h-[180px] w-full max-h-[260px]"
                          >
                            <BarChart
                              data={chartData}
                              layout="vertical"
                              margin={{
                                left: 30,
                                right: 20,
                                top: 10,
                                bottom: 10,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                              />
                              <YAxis
                                dataKey="option"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={100}
                                className="text-[10px]"
                              />
                              <XAxis type="number" hide />
                              <Bar
                                dataKey="respuestas"
                                fill="oklch(var(--primary))"
                                radius={4}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Sin datos de opciones para graficar.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Answer detail slide drawer Sheet */}
      <Sheet
        open={!!selectedAnswer}
        onOpenChange={(open) => !open && setSelectedAnswer(null)}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b border-border/40 pb-4">
            <SheetTitle>Detalle de Respuesta</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              ID: {selectedAnswer?.id}
            </SheetDescription>
          </SheetHeader>

          {selectedAnswer && survey && (
            <div className="py-6 space-y-6">
              <div className="flex justify-between items-center bg-muted/30 border border-border/20 p-3 rounded text-xs text-muted-foreground">
                <p>IP: {selectedAnswer.originIp}</p>
                <p>
                  {new Date(selectedAnswer.createdAt).toLocaleString("es-CU")}
                </p>
              </div>

              <div className="space-y-4">
                {survey.questions.map((question) => {
                  const matchingResponse = selectedAnswer.responses.find(
                    (r) => r.id === question.id,
                  );

                  let responseText = "Sin responder";

                  if (matchingResponse) {
                    if (question.type === "TEXT_ANSWER") {
                      responseText = matchingResponse.content as string;
                    } else if (
                      question.type === "SINGLE_SELECT" ||
                      question.type === "MULTI_SELECT"
                    ) {
                      const selectedIds =
                        (matchingResponse.content as number[]) || [];
                      const matchingOptionContents = question.options
                        ?.filter((opt) => selectedIds.includes(opt.id))
                        .map((opt) => opt.content);

                      responseText =
                        matchingOptionContents &&
                        matchingOptionContents.length > 0
                          ? matchingOptionContents.join(", ")
                          : "Opción no encontrada";
                    }
                  }

                  return (
                    <div
                      key={question.id}
                      className="space-y-1.5 p-3.5 rounded border border-border/30 bg-card"
                    >
                      <Label className="text-xs font-semibold text-foreground">
                        {question.name}
                      </Label>
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded font-medium">
                        {responseText}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-border/40 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm("¿Seguro que deseas eliminar esta respuesta?")
                    ) {
                      deleteAnswer.mutate({
                        slug: survey.slug,
                        id: selectedAnswer.id,
                      });
                    }
                  }}
                  disabled={deleteAnswer.isPending}
                  className="cursor-pointer gap-2"
                >
                  <Trash2 className="size-4" />
                  <span>Eliminar respuesta</span>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
