"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { LoginInputSchema } from "@kairopro/contracts";
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react";

import { GoogleIcon } from "@/components/common/google-icon";
import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function validateEmail(value: string): string | null {
  const res = LoginInputSchema.pick({ email: true }).safeParse({
    email: value,
  });
  if (!res.success) {
    return (
      res.error.flatten().fieldErrors.email?.[0] ??
      "Enter a valid email address."
    );
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    const validation = LoginInputSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      if (fieldErrors.email?.[0]) setEmailError(fieldErrors.email[0]);
      if (fieldErrors.password?.[0]) setAuthError(fieldErrors.password[0]);
      return;
    }
    setEmailError(null);

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setAuthError("Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-[380px] flex-col">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <span className="text-base font-medium tracking-tight text-zinc-100">
          KairoPro
        </span>
        <Badge variant="outline" mono className="ml-1 text-zinc-400">
          v2.4-beta
        </Badge>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        Sign in to KairoPro
      </h1>
      <p className="mb-8 mt-1 text-sm text-zinc-400">Welcome back.</p>

      {authError && (
        <div className="mb-4 flex items-center gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <CircleAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{authError}</span>
        </div>
      )}

      <Button
        variant="outline"
        className="h-10 w-full gap-3 bg-brand-surface-muted"
        type="button"
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="relative flex items-center py-6">
        <Separator className="flex-1" />
        <span className="mx-4 shrink-0 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <form className="flex w-full flex-col" onSubmit={onSubmit} noValidate>
        <div className="mb-4 flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-400" htmlFor="email">
            Email
          </Label>
          <Input
            aria-invalid={emailError ? true : undefined}
            className="h-10 rounded-[4px]"
            id="email"
            placeholder="you@company.com"
            type="email"
            value={email}
            onBlur={() => {
              if (email) setEmailError(validateEmail(email));
            }}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(validateEmail(event.target.value));
            }}
          />
          {emailError && (
            <p
              className="flex items-center gap-1.5 text-xs text-rose-400"
              role="alert"
            >
              <CircleAlert className="h-3.5 w-3.5" />
              {emailError}
            </p>
          )}
        </div>

        <div className="mb-2 flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-400" htmlFor="password">
            Password
          </Label>
          <div className="relative flex items-center">
            <Input
              className="h-10 rounded-[4px] pr-11"
              id="password"
              placeholder="••••••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              aria-label="Toggle password visibility"
              className="absolute right-0 flex items-center pr-3.5 text-zinc-500 transition-colors hover:text-zinc-200"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <a
            className="mt-1 self-end text-xs text-zinc-500 transition-colors hover:text-zinc-100"
            href="/forgot-password"
          >
            Forgot password?
          </a>
        </div>

        <Button className="mt-6 h-10 w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-zinc-500">
        Don&apos;t have an account?
        <a
          className="ml-1 text-brand-purple-light transition-colors hover:text-zinc-100"
          href="/register"
        >
          Create one
        </a>
      </p>
    </div>
  );
}
