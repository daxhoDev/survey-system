import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { createInvitationFormSchema } from "@/lib/schemas";
import { Check, Copy, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getGetAllInvitationsQueryKey,
  useCreateInvitation,
  useGetAllInvitations,
  useRevokeInvitation,
} from "@/lib/api/invitations/invitations";
import {
  InvitationStatus,
  type CreateInvitation,
  type Invitation,
} from "@/lib/api/sondixAPI.schemas";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import StatusChip from "@/components/StatusChip";
import StatusLabel, { type Status } from "@/components/StatusLabel";
import RequiredMark from "@/components/RequiredMark";
import { EmptyState, ErrorState, SkeletonRules } from "@/components/DataStates";
import { invalidProps } from "@/lib/form";

const statusLabels: Record<InvitationStatus, Status> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
  expired: "Caducada",
};

type StatusFilter = InvitationStatus | "all";

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  ...Object.values(InvitationStatus).map((status) => ({
    value: status,
    label: statusLabels[status],
  })),
];

const formatDate = (date: string) => new Date(date).toLocaleString("es-CU");

function RevokeButton({ invitation }: { invitation: Invitation }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const revoke = useRevokeInvitation({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getGetAllInvitationsQueryKey() });
        toast.success("Invitación revocada");
      },
      onError(error) {
        toast.error(error.detail);
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          loading={revoke.isPending}
          className="text-rust"
        >
          <XCircle aria-hidden="true" />
          <span>Revocar</span>
        </Button>
      </DialogTrigger>
      <ConfirmationDialog
        confirmText="Revocar"
        description={`¿Seguro que deseas revocar la invitación de ${invitation.email}? El enlace dejará de funcionar.`}
        onConfirm={() => {
          setOpen(false);
          revoke.mutate({ id: invitation.id });
        }}
      />
    </Dialog>
  );
}

const columns: ColumnDef<Invitation>[] = [
  { accessorKey: "email", header: "Correo electrónico" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusLabel status={statusLabels[row.original.status]} />,
  },
  {
    id: "invitedBy",
    header: "Invitada por",
    cell: ({ row }) => row.original.invitedBy?.username ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Creada",
    meta: { numeric: true },
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "expiresAt",
    header: "Caduca",
    meta: { numeric: true },
    cell: ({ row }) => formatDate(row.original.expiresAt),
  },
  {
    id: "actions",
    header: "Acciones",
    meta: { actions: true },
    cell: ({ row }) =>
      row.original.status === "pending" ? (
        <RevokeButton invitation={row.original} />
      ) : null,
  },
];

export default function InvitationsPage() {
  const { data, isPending, isError, isSuccess, refetch, isFetching } =
    useGetAllInvitations();
  const queryClient = useQueryClient();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<CreateInvitation>({
    defaultValues: { email: "" },
    reValidateMode: "onChange",
    resolver: zodResolver(createInvitationFormSchema),
  });

  const create = useCreateInvitation({
    mutation: {
      onSuccess(response) {
        setLink(`${window.location.origin}/auth/invite/${response.data.token}`);
        setCopied(false);
        // resetField keeps the field registered (reset() drops the registry and
        // relies on the ref callback re-running, which memoised JSX skips).
        resetField("email");
        queryClient.invalidateQueries({ queryKey: getGetAllInvitationsQueryKey() });
      },
      onError(error) {
        toast.error(error.detail);
      },
    },
  });

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        toast.success("Enlace copiado al portapapeles");
      },
      () => toast.error("No se pudo copiar el enlace. Cópialo manualmente."),
    );
  };

  const invitations = data?.data ?? [];
  const shown =
    filter === "all" ? invitations : invitations.filter((i) => i.status === filter);

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">Invitaciones</h1>
        <p className="text-body text-ink-muted">
          Cada invitación genera un enlace de un solo uso que caduca en 48
          horas. Envíalo tú mismo a la persona invitada.
        </p>
      </div>

      <form
        noValidate
        aria-label="Nueva invitación"
        className="flex flex-col gap-2"
        onSubmit={handleSubmit((values) => create.mutate({ data: values }))}
      >
        <Label htmlFor="invitation-email">
          Correo electrónico <RequiredMark />
        </Label>
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            id="invitation-email"
            type="email"
            autoComplete="off"
            aria-required="true"
            placeholder="persona@ejemplo.com"
            className="md:flex-1"
            {...invalidProps(errors.email, "invitation-email-error")}
            {...register("email")}
          />
          <Button type="submit" loading={create.isPending}>
            <Send aria-hidden="true" />
            <span>Invitar</span>
          </Button>
        </div>
        {errors.email && (
          <FieldError id="invitation-email-error">
            {errors.email.message}
          </FieldError>
        )}
      </form>

      {link && (
        <div className="flex flex-col gap-2 border-y border-rule-strong py-4">
          <Label htmlFor="invitation-link">Enlace de invitación</Label>
          <div className="flex gap-2">
            <Input
              id="invitation-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copiar enlace"
              aria-label="Copiar enlace"
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </div>
          <p className="text-small text-ink-muted">
            Este enlace solo se muestra ahora y caduca en 48 horas.
          </p>
        </div>
      )}

      <section aria-label="Lista de invitaciones" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {filters.map(({ value, label }) => (
            <StatusChip
              key={value}
              pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </StatusChip>
          ))}
        </div>

        {isPending && (
          <SkeletonRules
            label="Cargando invitaciones..."
            widths={Array(4).fill("100%")}
          />
        )}
        {isError && (
          <ErrorState onRetry={() => refetch()} retrying={isFetching}>
            Error al cargar las invitaciones
          </ErrorState>
        )}
        {isSuccess && shown.length === 0 && (
          <EmptyState className="border-y border-rule-strong py-3">
            {filter === "all"
              ? "Todavía no hay invitaciones."
              : "Ninguna invitación tiene este estado."}
          </EmptyState>
        )}
        {isSuccess && shown.length > 0 && (
          <DataTable columns={columns} data={shown} />
        )}
      </section>
    </div>
  );
}
