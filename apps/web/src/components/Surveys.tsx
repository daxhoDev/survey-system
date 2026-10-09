import {
  useGetAllSurveys,
  useUpdateSurveyBySlug,
  getGetAllSurveysQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  getGetSurveySummaryQueryKey,
  useGetSurveySummary,
} from "@/lib/api/stats/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  GetAllSurveysParams,
  GetAllSurveysSort,
  Survey,
} from "@/lib/api/sondixAPI.schemas";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  CircleX,
  Eye,
  Play,
  Pause,
  Plus,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Input } from "./ui/input";
import ListPagination from "./ListPagination";
import { toast } from "sonner";
import LockedBadge from "@/components/LockedBadge";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "true" | "false";
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
];

// Survey list (FE-17, FE-18): search, status filter, sort and page live in
// the URL (?search=&active=&sort=&page=), so back/reload/share keep them.
export default function Surveys() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const active = (params.get("active") as StatusFilter | null) ?? "all";
  const sort = (params.get("sort") as GetAllSurveysSort | null) ?? "-creation";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // Changing anything but the page goes back to page 1.
  const update = (changes: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        if (!("page" in changes)) next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  // The search box updates the URL once typing pauses.
  const [searchInput, setSearchInput] = useState(search);
  // ...and follows the URL when it changes from outside (back/forward).
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    if (searchInput.trim() !== search) setSearchInput(search);
  }
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(
      () => update({ search: searchInput.trim() || null }),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query: GetAllSurveysParams = {
    sort,
    ...(search && { search }),
    ...(active !== "all" && { active }),
    ...(page > 1 && { page: String(page) }),
  };
  const { data, isError, isPending, isFetching } = useGetAllSurveys(query, {
    query: {
      queryKey: getGetAllSurveysQueryKey(query),
      placeholderData: keepPreviousData,
    },
  });
  const summary = useGetSurveySummary();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleStatus = useUpdateSurveyBySlug({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: getGetAllSurveysQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetSurveySummaryQueryKey(),
        });
        toast.success("Estado de la encuesta actualizado");
      },
      onError(error) {
        toast.error(error.detail || "Error al actualizar el estado");
      },
    },
  });

  const surveys = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const filtered = search !== "" || active !== "all";

  const sortHeader = (label: string, field: "name" | "creation") => {
    const current =
      sort === field ? "asc" : sort === `-${field}` ? "desc" : null;
    const Icon =
      current === "asc" ? ArrowUp : current === "desc" ? ArrowDown : ArrowUpDown;
    const next = current === "asc" ? `-${field}` : field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => update({ sort: next === "-creation" ? null : next })}
      >
        {label}
        <Icon className="text-muted-foreground" />
        <span className="sr-only">
          {current === "asc"
            ? ", orden ascendente"
            : current === "desc"
              ? ", orden descendente"
              : ", ordenar"}
        </span>
      </Button>
    );
  };

  const columns: ColumnDef<Survey>[] = [
    {
      accessorKey: "name",
      header: () => sortHeader("Nombre", "name"),
    },
    {
      accessorKey: "createdAt",
      header: () => sortHeader("Fecha de creación", "creation"),
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
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-3 py-0.5 border rounded-full flex items-center justify-center w-fit gap-1.5 text-xs font-semibold tracking-wide uppercase",
                isActive
                  ? "bg-success/10 text-success-text border-success/30"
                  : "bg-destructive/10 text-destructive-text border-destructive/30",
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
            {row.original.isLocked && <LockedBadge />}
          </div>
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
                <span className="sr-only">Abrir menú de acciones</span>
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-h1">Encuestas</h1>
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
          <CardContent className="text-3xl font-bold tabular-nums">
            {summary.data?.data.all ?? "–"}
          </CardContent>
        </Card>
        <Card className="w-full max-w-60 py-6">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encuestas activas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-primary tabular-nums">
            {summary.data?.data.active ?? "–"}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar encuestas por nombre"
              placeholder="Buscar por nombre"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div
            role="group"
            aria-label="Filtrar por estado"
            className="flex flex-wrap gap-2"
          >
            {statusFilters.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={active === value ? "default" : "outline"}
                aria-pressed={active === value}
                onClick={() => update({ active: value === "all" ? null : value })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {isError && (
          <p className="text-destructive-text">Error al cargar las encuestas</p>
        )}
        {!isPending && !isError && (
          <div
            className={cn("space-y-4 transition-opacity", isFetching && "opacity-60")}
            aria-busy={isFetching}
          >
            <DataTable
              columns={columns}
              data={surveys}
              emptyMessage={
                filtered
                  ? "Ninguna encuesta coincide con la búsqueda o el filtro."
                  : "Todavía no hay encuestas. Crea la primera con \"Crear encuesta\"."
              }
            />
            {total > 0 && (
              <ListPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(p) => update({ page: p > 1 ? String(p) : null })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
