import {
  useGetAllSurveys,
  useUpdateSurveyBySlug,
  getGetAllSurveysQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Survey } from "@/lib/api/surveySystemAPI.schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./ui/data-table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  CircleX,
  Eye,
  Play,
  Pause,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Surveys() {
  const { data, isError, isSuccess } = useGetAllSurveys({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleStatus = useUpdateSurveyBySlug({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: getGetAllSurveysQueryKey(),
        });
        toast.success("Estado de la encuesta actualizado");
      },
      onError(error) {
        toast.error(error.detail || "Error al actualizar el estado");
      },
    },
  });

  const surveys = data as unknown as {
    message: string;
    data: Survey[];
    status: string;
    statusCode: number;
  };

  const columns: ColumnDef<Survey>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string;
        return new Date(createdAt).toLocaleDateString("es-CU");
      },
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <span
            className={cn(
              "px-3 py-0.5 border rounded-full flex items-center justify-center w-fit gap-1.5 text-[10px] font-semibold tracking-wide uppercase",
              isActive
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20",
            )}
          >
            {isActive ? (
              <>
                <CheckCircle className="size-3.5" />
                <span>Activa</span>
              </>
            ) : (
              <>
                <CircleX className="size-3.5" />
                <span>Inactiva</span>
              </>
            )}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const survey = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-8 w-8"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open actions menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/dashboard/surveys/${survey.slug}`)}
                className="cursor-pointer gap-2"
              >
                <Eye className="size-3.5" />
                <span>Ver detalles</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toggleStatus.mutate({
                    slug: survey.slug,
                    data: { isActive: !survey.isActive },
                  });
                }}
                disabled={toggleStatus.isPending}
                className="cursor-pointer gap-2"
              >
                {survey.isActive ? (
                  <>
                    <Pause className="size-3.5" />
                    <span>Desactivar</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" />
                    <span>Activar</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {isError && (
        <p className="text-destructive">Error al cargar las encuestas</p>
      )}
      {isSuccess && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Encuestas</h1>
              <p className="text-sm text-muted-foreground">
                Administra y monitorea tus encuestas creadas.
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard/surveys/create")}
              className="cursor-pointer self-start sm:self-auto gap-2"
            >
              <Plus className="size-4" />
              <span>Crear encuesta</span>
            </Button>
          </div>

          <div className="flex gap-6">
            <Card className="w-full max-w-60 py-6">
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de encuestas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {surveys.data.length}
              </CardContent>
            </Card>
            <Card className="w-full max-w-60 py-6">
              <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Encuestas activas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold text-primary">
                {surveys.data.filter((survey) => survey.isActive === true)
                  .length}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <DataTable columns={columns} data={surveys.data} />
          </div>
        </>
      )}
    </div>
  );
}

