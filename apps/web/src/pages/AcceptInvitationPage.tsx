import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { acceptInvitationSchema } from "@survey-system/schemas";
import {
  useAcceptInvitation,
  useGetInvitationByToken,
} from "@/lib/api/invitations/invitations";
import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useLogoutUser,
} from "@/lib/api/users/users";
import type { AcceptInvitation } from "@/lib/api/surveySystemAPI.schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import logo from "@/assets/logo.png";

const cardClass = "w-97/100 max-w-120";

export default function AcceptInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invitation = useGetInvitationByToken(token);
  const session = useGetCurrentUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitation>({
    reValidateMode: "onChange",
    resolver: zodResolver(acceptInvitationSchema),
  });

  const accept = useAcceptInvitation({
    mutation: {
      onSuccess(data) {
        // Same shape as GET /users/me: { data: user } (AUTH-21).
        queryClient.setQueryData(getGetCurrentUserQueryKey(), { data: data.data });
        navigate("/dashboard");
      },
      onError(error) {
        toast.error(<p className="text-destructive">{error.detail}</p>);
      },
    },
  });

  const logout = useLogoutUser({
    mutation: {
      onSuccess() {
        // Clears the cache and refetches: without a session the form shows.
        queryClient.resetQueries();
      },
      onError(error) {
        toast.error(<p className="text-destructive">{error.detail}</p>);
      },
    },
  });

  if (invitation.isLoading || session.isLoading) {
    return (
      <p className="text-sm text-muted-foreground animate-pulse">
        Cargando invitación...
      </p>
    );
  }

  if (invitation.isError || !invitation.data) {
    return (
      <Card className={`${cardClass} border-destructive/20 bg-destructive/5 text-center`}>
        <CardHeader>
          <CardTitle className="text-destructive">
            Invitación no válida o caducada
          </CardTitle>
          <CardDescription>
            Pide a quien te invitó que te envíe un enlace nuevo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { email } = invitation.data.data;
  const currentUser = session.data?.data;

  if (currentUser) {
    return (
      <Card className={`${cardClass} text-center`}>
        <CardHeader>
          <CardTitle>Ya tienes una sesión iniciada</CardTitle>
          <CardDescription>
            Estás conectado como {currentUser.username}. Cierra la sesión para
            aceptar la invitación de {email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={logout.isPending}
                className="cursor-pointer"
              >
                Cerrar sesión
              </Button>
            </DialogTrigger>
            <ConfirmationDialog
              description={`¿Estás seguro de que deseas cerrar la sesión como ${currentUser.username}?`}
              confirmText="Cerrar sesión"
              onConfirm={() => logout.mutate()}
            />
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="text-center flex flex-col items-center">
        <img src={logo} className="w-15 mb-5" />
        <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
        <CardDescription>
          Te invitaron a unirte al sistema de gestión de encuestas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => accept.mutate({ token, data }))}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" value={email} readOnly disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Nombre de usuario</FieldLabel>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <FieldError>{errors.username.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="passwordConfirm">
                Confirmar contraseña
              </FieldLabel>
              <Input
                id="passwordConfirm"
                type="password"
                {...register("passwordConfirm")}
              />
              {errors.passwordConfirm && (
                <FieldError>{errors.passwordConfirm.message}</FieldError>
              )}
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={accept.isPending}
                className="cursor-pointer"
              >
                Crear cuenta
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
