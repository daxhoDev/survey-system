import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { invalidProps } from "@/lib/form";
import { loginFormSchema } from "@/lib/schemas";
import type { UserLogin } from "@/lib/api/sondixAPI.schemas";
import { useLoginUser, getGetCurrentUserQueryKey } from "@/lib/api/users/users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput";
import RequiredMark from "@/components/RequiredMark";

// Login form (REQ-FE-015), laid out for the auth frame (REQ-FE-030).
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserLogin>({
    reValidateMode: "onChange",
    resolver: zodResolver(loginFormSchema),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const login = useLoginUser({
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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-balance">Inicia sesión</h1>
        <p className="text-body text-ink-muted">
          Accede al sistema de gestión de encuestas
        </p>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit((data) => {
          login.mutate({ data });
        })}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">
              Correo electrónico <RequiredMark />
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-required="true"
              placeholder="correo@ejemplo.com"
              {...invalidProps(errors.email, "email-error")}
              {...register("email")}
            />
            {errors.email && (
              <FieldError id="email-error">{errors.email.message}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">
              Contraseña <RequiredMark />
            </FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-required="true"
              placeholder="Introduce tu contraseña"
              {...invalidProps(errors.password, "password-error")}
              {...register("password")}
            />
            {errors.password && (
              <FieldError id="password-error">
                {errors.password.message}
              </FieldError>
            )}
          </Field>
          <Button type="submit" loading={login.isPending} className="w-full">
            Iniciar sesión
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
