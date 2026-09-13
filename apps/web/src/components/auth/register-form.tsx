"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { RegisterInputSchema } from "@kairopro/contracts";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { GoogleIcon } from "@/components/common/google-icon";
import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const strengthLevels = [
  { label: "—", textClass: "text-zinc-500", barClass: "bg-white/10" },
  { label: "Weak", textClass: "text-rose-400", barClass: "bg-rose-400" },
  { label: "Fair", textClass: "text-amber-300", barClass: "bg-amber-300" },
  {
    label: "Strong",
    textClass: "text-brand-green",
    barClass: "bg-brand-green",
  },
];

function evaluatePassword(password: string) {
  const requirements = {
    length: password.length >= 8,
    special: /[^A-Za-z]/.test(password),
    casing: /[a-z]/.test(password) && /[A-Z]/.test(password),
  };
  const score =
    Number(requirements.length) +
    Number(requirements.special) +
    Number(requirements.casing);
  return { requirements, score };
}

const checklist = [
  { key: "length", label: "8+ characters" },
  { key: "special", label: "1 special / number" },
  { key: "casing", label: "Mixed casing" },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { requirements, score } = evaluatePassword(password);
  const level = strengthLevels[score] ?? {
    label: "—",
    textClass: "text-zinc-500",
    barClass: "bg-white/10",
  };
  const nameValid = fullName.trim().length >= 2;
  const emailValid = EMAIL_PATTERN.test(email.trim());

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const validation = RegisterInputSchema.safeParse({
      name: fullName,
      email,
      password,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setNameError(fieldErrors.name?.[0] ?? null);
      setEmailError(fieldErrors.email?.[0] ?? null);
      setPasswordError(fieldErrors.password?.[0] ?? null);
      return;
    }

    setNameError(null);
    setEmailError(null);
    setPasswordError(null);

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(
          data.error?.message || "Registration failed. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setServerError("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-base font-medium tracking-tight text-zinc-100">
            KairoPro
          </span>
          <Badge variant="cyan" mono>
            v2.4-beta
          </Badge>
        </div>
        <span className="hidden items-center gap-1.5 font-mono-tech text-[11px] uppercase tracking-wide text-zinc-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          env_auth_portal
        </span>
      </div>

      <div className="mb-4">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-100">
          Create your KairoPro account
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Start building full-stack apps from PRDs in minutes. Free during beta.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 flex items-center gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <CircleAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{serverError}</span>
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

      <div className="relative flex items-center py-4">
        <Separator className="flex-1" />
        <span className="mx-4 shrink-0 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label
              className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400"
              htmlFor="fullName"
            >
              Full name
            </Label>
            <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Required
            </span>
          </div>
          <div className="relative">
            <Input
              aria-invalid={nameError ? true : undefined}
              className="h-10 rounded-[4px] pr-10 font-mono-tech text-xs"
              id="fullName"
              placeholder="Linus Torvalds"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            {nameValid && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-brand-green" />
            )}
          </div>
          {nameError && (
            <p
              className="flex items-center gap-1.5 text-xs text-rose-400"
              role="alert"
            >
              <CircleAlert className="h-3.5 w-3.5" />
              {nameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label
              className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400"
              htmlFor="workEmail"
            >
              Work email
            </Label>
            <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
              Dev identity
            </span>
          </div>
          <div className="relative">
            <Input
              aria-invalid={emailError ? true : undefined}
              className="h-10 rounded-[4px] pr-10 font-mono-tech text-xs"
              id="workEmail"
              placeholder="alex@company.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {emailValid && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-brand-green" />
            )}
          </div>
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label
              className="font-mono-tech text-[11px] uppercase tracking-wider text-zinc-400"
              htmlFor="passwordInput"
            >
              Access password
            </Label>
            <span
              className={cn(
                "font-mono-tech text-[10px] uppercase tracking-wider",
                level.textClass,
              )}
            >
              Strength: {level.label}
            </span>
          </div>
          <div className="relative flex items-center">
            <Input
              aria-invalid={passwordError ? true : undefined}
              className="h-10 rounded-[4px] pr-11 font-mono-tech text-xs tracking-wider"
              id="passwordInput"
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
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  index < score ? level.barClass : "bg-white/10",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 pt-1">
            {checklist.map((item) => {
              const met = requirements[item.key];
              return (
                <span
                  key={item.key}
                  className={cn(
                    "flex items-center gap-1 font-mono-tech text-[10px] uppercase tracking-wide",
                    met ? "text-brand-green" : "text-zinc-500",
                  )}
                >
                  {met ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {item.label}
                </span>
              );
            })}
          </div>
          {passwordError && (
            <p
              className="flex items-center gap-1.5 text-xs text-rose-400"
              role="alert"
            >
              <CircleAlert className="h-3.5 w-3.5" />
              {passwordError}
            </p>
          )}
        </div>

        <div className="rounded-[4px] bg-brand-surface p-3">
          <p className="text-xs leading-relaxed text-zinc-400">
            By creating an account, you agree to our{" "}
            <a
              className="text-brand-purple-light hover:underline"
              href="/terms"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="text-brand-purple-light hover:underline"
              href="/privacy"
            >
              Privacy Policy
            </a>
            . Beta access includes full MIT code ownership with zero telemetry
            on proprietary schemas.
          </p>
        </div>

        <Button
          className="group h-10 w-full gap-2"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            <>
              <span className="tracking-tight">
                Create account &amp; start building
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        Already have an account?
        <a
          className="ml-1 inline-flex items-center gap-1 font-medium text-brand-purple-light transition-colors hover:text-zinc-100"
          href="/login"
        >
          Sign in
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono-tech text-[11px]">
        <span className="text-zinc-500">TLS 1.3 • AES-256 GCM</span>
        <span className="flex items-center gap-1.5 text-brand-green">
          <span className="h-1.5 w-1.5 animate-pulse-cyan rounded-full bg-brand-green" />
          auth_daemon: online
        </span>
      </div>
    </div>
  );
}
