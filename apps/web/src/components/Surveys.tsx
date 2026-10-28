import {
  useGetAllSurveys,
  useUpdateSurveyBySlug,
  getGetAllSurveysQueryKey,
} from "@/lib/api/surveys/surveys";
import {
  getGetActiveSurveyStatsQueryKey,
  getGetSurveySummaryQueryKey,
  useGetSurveySummary,
} from "@/lib/api/stats/stats";
import { Button } from "@/components/ui/button";
import type {
  GetAllSurveysParams,
  GetAllSurveysSort,
  SurveyListItem,
} from "@/lib/api/sondixAPI.schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortableHeader, type SortDirection } from "./ui/data-table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Play, Pause, Plus, MoreHorizontal, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Input } from "./ui/input";
import ListPagination from "./ListPagination";
import { toast } from "sonner";
import LockedBadge from "@/components/LockedBadge";
import StatusLabel from "@/components/StatusLabel";
import StatusChip from "@/components/StatusChip";
import ActiveSurveys from "@/components/ActiveSurveys";
import { EmptyState, ErrorState, SkeletonRules } from "@/components/DataStates";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;
const numberFormat = new Intl.NumberFormat("es-CU");

type StatusFilter = "all" | "true" | "false";
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
];

// "1 encuesta" / "12 encuestas".
const count = (n: number, singular: string, plural: string) =>
  `${numberFormat.format(n)} ${n === 1 ? singular : plural}`;

// The survey list (REQ-FE-017, REQ-FE-018, REQ-FE-032): header row with the
// summary line, active-survey small multiples, then the list. Search, status
// filter, sort and page live in the URL (?search=&active=&sort=&page=), so
// back/reload/share keep them.
export default function Surveys() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const active = (params.get("active") as StatusFilter | null) ?? "all";
  const sort = (params.get("sort") as GetAllSurveysSort | null) ?? "-creation";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // The URL after `changes`; changing anything but the page goes back to 1.
  const nextParams = (
    prev: URLSearchParams,
    changes: Record<string, string | null>,
  ) => {
    const next = new URLSearchParams(prev);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    return next;
  };
  const update = (changes: Record<string, string | null>) => {
    setParams((prev) => nextParams(prev, changes), { replace: true });
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
  const { data, isError, isPending, isFetching, isPlaceholderData, refetch } =
    useGetAllSurveys(query, {
      query: {
        queryKey: getGetAllSurveysQueryKey(query),
        placeholderData: keepPreviousData,
      },
    });
  const summary = useGetSurveySummary();
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLElement>(null);

  const toggleStatus = useUpdateSurveyBySlug({
    mutation: {
      onSuccess() {
        for (const queryKey of [
          getGetAllSurveysQueryKey(),
          getGetSurveySummaryQueryKey(),
          getGetActiveSurveyStatsQueryKey(),
        ]) {
          queryClient.invalidateQueries({ queryKey });
        }
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

  const sortOf = (field: "name" | "creation"): SortDirection =>
    sort === field ? "ascending" : sort === `-${field}` ? "descending" : "none";
  const sortHeader = (label: string, field: "name" | "creation") => {
    const next = sortOf(field) === "ascending" ? `-${field}` : field;
    return (
      <SortableHeader
        label={label}
        sort={sortOf(field)}
        onSort={() => update({ sort: next === "-creation" ? null : next })}
      />
    );
  };

  // The details page's back link returns to the list as it is now (REQ-FE-021).
  const detailsState = { listSearch: params.toString() };

  const columns: ColumnDef<SurveyListItem>[] = [
    {
      accessorKey: "name",
      header: () => sortHeader("Nombre", "name"),
      meta: { label: "Nombre", sort: sortOf("name") },
      cell: ({ row }) => (
        <Link
          to={`/dashboard/surveys/${row.original.slug}`}
          state={detailsState}
          className="whitespace-normal text-ink underline decoration-rule-strong underline-offset-3 transition-colors duration-150 ease-out hover:decoration-ink"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusLabel status={row.original.isActive ? "Activa" : "Inactiva"} />
          {row.original.isLocked && <LockedBadge />}
        </div>
      ),
    },
    {
      accessorKey: "answerCount",
      header: "Respuestas",
      meta: { numeric: true },
      cell: ({ row }) => numberFormat.format(row.original.answerCount),
    },
    {
      accessorKey: "completedCount",
      header: "Completas",
      meta: { numeric: true },
      cell: ({ row }) => numberFormat.format(row.original.completedCount),
    },
    {
      accessorKey: "createdAt",
      header: () => sortHeader("Fecha de creación", "creation"),
      meta: { label: "Fecha de creación", sort: sortOf("creation"), numeric: true },
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("es-CU"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { actions: true },
      cell: ({ row }) => {
        const survey = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones de ${survey.name}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link to={`/dashboard/surveys/${survey.slug}`} state={detailsState}>
                  <Eye aria-hidden="true" className="size-3.5" />
                  <span>Ver detalles</span>
                </Link>
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
                    <Pause aria-hidden="true" className="size-3.5" />
                    <span>Desactivar</span>
                  </>
                ) : (
                  <>
                    <Play aria-hidden="true" className="size-3.5" />
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

  const counts = summary.data?.data;

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-balance">Encuestas</h1>
          {counts ? (
            <p className="figures text-small text-ink-muted">
              {count(counts.all, "encuesta", "encuestas")} ·{" "}
              {count(counts.active, "activa", "activas")} ·{" "}
              {count(counts.all - counts.active, "inactiva", "inactivas")}
            </p>
          ) : summary.isError ? (
            <ErrorState
              onRetry={() => summary.refetch()}
              retrying={summary.isFetching}
              className="py-0"
            >
              Error al cargar el resumen
            </ErrorState>
          ) : (
            <div role="status" aria-label="Cargando..." className="py-1.5">
              <Skeleton className="w-64 max-w-full" />
            </div>
          )}
        </div>
        <Button asChild className="max-md:w-full">
          <Link to="/dashboard/surveys/create">
            <Plus aria-hidden="true" />
            <span>Crear encuesta</span>
          </Link>
        </Button>
      </div>

      <ActiveSurveys
        activeCount={counts?.active}
        showAllTo={{ search: `?${nextParams(params, { active: "true" })}` }}
        onShowAll={() => listRef.current?.focus()}
      />

      <section
        ref={listRef}
        tabIndex={-1}
        aria-label="Lista de encuestas"
        className="flex flex-col gap-4 outline-none"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
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
              <StatusChip
                key={value}
                pressed={active === value}
                onClick={() => update({ active: value === "all" ? null : value })}
              >
                {label}
              </StatusChip>
            ))}
          </div>
        </div>

        {isPending && (
          <SkeletonRules label="Cargando encuestas..." widths={Array(6).fill("100%")} />
        )}
        {isError && (
          <ErrorState onRetry={() => refetch()} retrying={isFetching}>
            Error al cargar las encuestas
          </ErrorState>
        )}
        {!isPending && !isError && surveys.length === 0 && (
          <EmptyState
            className="border-y border-rule-strong py-3"
            action={
              filtered ? undefined : (
                <Button asChild variant="outline">
                  <Link to="/dashboard/surveys/create">Crear la primera encuesta</Link>
                </Button>
              )
            }
          >
            {filtered
              ? "Ninguna encuesta coincide con la búsqueda o el filtro."
              : "Todavía no hay encuestas."}
          </EmptyState>
        )}
        {!isPending && !isError && surveys.length > 0 && (
          <div
            className={cn("flex flex-col gap-4", isPlaceholderData && "opacity-50")}
            aria-busy={isPlaceholderData}
          >
            <DataTable columns={columns} data={surveys} />
            <ListPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => update({ page: p > 1 ? String(p) : null })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
