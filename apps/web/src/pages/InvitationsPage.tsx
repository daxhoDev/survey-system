import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { createInvitationSchema } from "@survey-system/schemas";
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
import { cn } from "@/lib/utils";

const statusLabels: Record<InvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
  expired: "Caducada",
};

const statusStyles: Record<InvitationStatus, string> = {
  pending: "bg-warning/10 text-warning-text border-warning/30",
  accepted: "bg-success/10 text-success-text border-success/30",
  revoked: "bg-destructive/10 text-destructive-text border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
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

function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span
      className={cn(
        "px-3 py-0.5 border rounded-full w-fit text-xs font-semibold tracking-wide uppercase",
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

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
          disabled={revoke.isPending}
          className="cursor-pointer gap-1.5 text-destructive-text hover:text-destructive-text hover:bg-destructive/10"
        >
          <XCircle className="size-3.5" />
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
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "invitedBy",
    header: "Invitada por",
    cell: ({ row }) => row.original.invitedBy?.username ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Creada",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "expiresAt",
    header: "Caduca",
    cell: ({ row }) => formatDate(row.original.expiresAt),
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) =>
      row.original.status === "pending" ? (
        <RevokeButton invitation={row.original} />
      ) : null,
  },
];

export default function InvitationsPage() {
  const { data, isError, isSuccess } = useGetAllInvitations();
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
    resolver: zodResolver(createInvitationSchema),
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
        toast.error(<p className="text-destructive-text">{error.detail}</p>);
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-h1">Invitaciones</h1>
        <p className="text-sm text-muted-foreground">
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
              disabled={create.isPending}
              className="cursor-pointer gap-2 sm:mt-6.75"
            >
              <Send className="size-4" />
              <span>Invitar</span>
            </Button>
          </form>

          {link && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium">Enlace de invitación</p>
              <div className="flex gap-2">
                <Input readOnly value={link} aria-label="Enlace de invitación" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copiar enlace"
                  aria-label="Copiar enlace"
                  className="cursor-pointer shrink-0"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este enlace solo se muestra ahora y caduca en 48 horas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isError && (
        <p className="text-destructive-text">Error al cargar las invitaciones</p>
      )}
      {isSuccess && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {filters.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className="cursor-pointer"
              >
                {label}
              </Button>
            ))}
          </div>
          <DataTable columns={columns} data={shown} />
        </div>
      )}
    </div>
  );
}
