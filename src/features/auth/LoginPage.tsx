import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { FormField } from "../../components/form/FormField";
import { isApiError } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "./auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      pushToast("success", "Admin session ready.");
      const next = (location.state as { next?: string } | null)?.next ?? "/admin";
      navigate(next, { replace: true });
    } catch (error) {
      setServerError(isApiError(error) ? error.message : error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="eyebrow">Scenee Operations Console</p>
        <h1>Admin sign-in</h1>
        <p className="login-copy">Use your backend admin account. Non-admin accounts are rejected after `/v1/auth/me` resolves.</p>
        <form className="stack-form" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Email" error={errors.email?.message}>
            <input className="input" type="email" placeholder="admin@example.com" {...register("email")} />
          </FormField>
          <FormField label="Password" error={errors.password?.message}>
            <input className="input" type="password" placeholder="Minimum 8 characters" {...register("password")} />
          </FormField>
          {serverError ? <div className="alert alert--error">{serverError}</div> : null}
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
