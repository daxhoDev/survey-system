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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import StatusChip from "@/components/StatusChip";
import StatusLabel, { type Status } from "@/components/StatusLabel";
import { ErrorState } from "@/components/DataStates";

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
          <XCircle />
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
  { accessorKey: "email", header: "Email" },
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
  const { data, isError, isSuccess, refetch, isFetching } = useGetAllInvitations();
  const queryClient = useQueryClient();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInvitation>({
    reValidateMode: "onChange",
    resolver: zodResolver(createInvitationFormSchema),
  });

  const create = useCreateInvitation({
    mutation: {
      onSuccess(response) {
        setLink(`${window.location.origin}/auth/invite/${response.data.token}`);
        setCopied(false);
        reset();
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
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
  };

  const invitations = data?.data ?? [];
  const shown =
    filter === "all" ? invitations : invitations.filter((i) => i.status === filter);

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-h1">Invitaciones</h1>
        <p className="text-body text-ink-muted">
          Invita a otras personas a crear su cuenta en el sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva invitación</CardTitle>
          <CardDescription>
            Se genera un enlace de un solo uso que caduca en 48 horas. Envíalo tú
            mismo a la persona invitada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col sm:flex-row gap-3 sm:items-start"
            onSubmit={handleSubmit((values) => create.mutate({ data: values }))}
          >
            <Field className="flex-1">
              <FieldLabel htmlFor="invitation-email">
                Correo electrónico
              </FieldLabel>
              <Input
                id="invitation-email"
                type="email"
                placeholder="persona@ejemplo.com"
                {...register("email")}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
            <Button
              type="submit"
              loading={create.isPending}
              className="sm:mt-6.75"
            >
              <Send />
              <span>Invitar</span>
            </Button>
          </form>

          {link && (
            <div className="space-y-2 border-t border-rule pt-4">
              <p className="text-body font-semibold">Enlace de invitación</p>
              <div className="flex gap-2">
                <Input readOnly value={link} aria-label="Enlace de invitación" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copiar enlace"
                  aria-label="Copiar enlace"
                  className="shrink-0"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-caption text-ink-muted">
                Este enlace solo se muestra ahora y caduca en 48 horas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isError && (
        <ErrorState onRetry={() => refetch()} retrying={isFetching}>
          Error al cargar las invitaciones
        </ErrorState>
      )}
      {isSuccess && (
        <div className="space-y-4">
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
          <DataTable columns={columns} data={shown} />
        </div>
      )}
    </div>
  );
}
