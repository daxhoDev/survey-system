import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { acceptInvitationFormSchema } from "@/lib/schemas";
import { invalidProps } from "@/lib/form";
import {
  useAcceptInvitation,
  useGetInvitationByToken,
} from "@/lib/api/invitations/invitations";
import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useLogoutUser,
} from "@/lib/api/users/users";
import type { AcceptInvitation } from "@/lib/api/sondixAPI.schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import RequiredMark from "@/components/RequiredMark";
import { LoadingLine } from "@/components/DataStates";

// Title and description of the page inside the auth frame (REQ-FE-030).
function PageHeading({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-h2 text-balance">{title}</h1>
      <p className="text-body text-ink-muted">{children}</p>
    </div>
  );
}

// `/auth/invite/:token` (REQ-FE-028).
export default function AcceptInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const invitation = useGetInvitationByToken(token);
  const session = useGetCurrentUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitation>({
    reValidateMode: "onChange",
    resolver: zodResolver(acceptInvitationFormSchema),
  });

  const accept = useAcceptInvitation({
    mutation: {
      onSuccess(data) {
        // Same shape as GET /users/me: { data: user } (AUTH-21).
        queryClient.setQueryData(getGetCurrentUserQueryKey(), { data: data.data });
        navigate("/dashboard");
      },
      onError(error) {
        toast.error(error.detail);
      },
    },
  });

  const logout = useLogoutUser({
    mutation: {
      onSuccess() {
        setConfirmOpen(false);
        // Clears the cache and refetches: without a session the form shows.
        queryClient.resetQueries();
      },
      onError(error) {
        toast.error(error.detail);
      },
    },
  });

  if (invitation.isLoading || session.isLoading) {
    return <LoadingLine>Cargando invitación...</LoadingLine>;
  }

  if (invitation.isError || !invitation.data) {
    return (
      <PageHeading title="Invitación no válida o caducada">
        Pide a quien te invitó que te envíe un enlace nuevo.
      </PageHeading>
    );
  }

  const { email } = invitation.data.data;
  const currentUser = session.data?.data;

  if (currentUser) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Ya tienes una sesión iniciada">
          Estás conectado como {currentUser.username}. Cierra la sesión para
          aceptar la invitación de {email}.
        </PageHeading>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              loading={logout.isPending}
              className="w-full"
            >
              Cerrar sesión
            </Button>
          </DialogTrigger>
          <ConfirmationDialog
            description={`¿Estás seguro de que deseas cerrar la sesión como ${currentUser.username}?`}
            confirmText="Cerrar sesión"
            isPending={logout.isPending}
            onConfirm={() => logout.mutate()}
          />
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Crea tu cuenta">
        Te invitaron a unirte al sistema de gestión de encuestas.
      </PageHeading>
      <form
        noValidate
        onSubmit={handleSubmit((data) => accept.mutate({ token, data }))}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="text-ink-muted"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="username">
              Nombre de usuario <RequiredMark />
            </FieldLabel>
            <Input
              id="username"
              autoComplete="username"
              aria-required="true"
              {...invalidProps(errors.username, "username-error")}
              {...register("username")}
            />
            {errors.username && (
              <FieldError id="username-error">
                {errors.username.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">
              Contraseña <RequiredMark />
            </FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-required="true"
              {...invalidProps(errors.password, "password-error")}
              {...register("password")}
            />
            {errors.password && (
              <FieldError id="password-error">
                {errors.password.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="passwordConfirm">
              Confirmar contraseña <RequiredMark />
            </FieldLabel>
            <PasswordInput
              id="passwordConfirm"
              autoComplete="new-password"
              aria-required="true"
              {...invalidProps(errors.passwordConfirm, "passwordConfirm-error")}
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <FieldError id="passwordConfirm-error">
                {errors.passwordConfirm.message}
              </FieldError>
            )}
          </Field>
          <Button type="submit" loading={accept.isPending} className="w-full">
            Crear cuenta
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
