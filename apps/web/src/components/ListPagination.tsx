import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

// "Mostrando 11–20 de 43", "Página 2 de 5" and Anterior / Siguiente, for
// server-paginated lists (REQ-FE-018).
export default function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: ListPaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <p className="figures text-small text-ink-muted" aria-live="polite">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft />
          Anterior
        </Button>
        <span className="figures px-1 text-small text-ink">
          Página {Math.min(page, pages)} de {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
        >
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
