"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  CirclePlus,
  Cloud,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Route,
  Save,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
        fill="#EA4335"
      />
      <path
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
        fill="#4285F4"
      />
      <path
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
        fill="#FBBC05"
      />
      <path
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
        fill="#34A853"
      />
    </svg>
  );
}

function StripeMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="#635BFF"
      className={className}
    >
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.935 15.688.5 12.633.5 6.643.5 2.5 3.655 2.5 8.784c0 5.485 5.215 6.741 8.878 8.163 2.148.835 3.011 1.542 3.011 2.502 0 1.011-.912 1.634-2.434 1.634-2.42 0-5.116-1.127-6.953-2.133l-.934 5.619c1.656.772 4.673 1.431 7.643 1.431 6.353 0 10.742-3.047 10.742-8.322 0-5.59-5.138-7.058-8.477-8.428z" />
    </svg>
  );
}

type ServiceStatus = "connected" | "unconfigured" | "unused";

interface ServiceField {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  secret?: boolean;
}

interface Service {
  id: string;
  name: string;
  vars: string;
  status: ServiceStatus;
  configured: string;
  badge: ReactNode;
  envNames: string[];
  fields: ServiceField[];
  redirectHelper?: string;
  redirectUri?: string;
}

const INITIAL_SERVICES: Service[] = [
  {
    id: "google",
    name: "Google OAuth",
    vars: "CLIENT_ID & SECRET",
    status: "connected",
    configured: "2 days ago",
    badge: <GoogleMark className="h-4 w-4" />,
    envNames: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    fields: [
      {
        id: "client-id",
        label: "Client ID",
        hint: "Provider Public Identifier",
        value:
          "948301840291-k8fqm2lq98vsmq1pqwz91ka9.apps.googleusercontent.com",
      },
      {
        id: "client-secret",
        label: "Client Secret",
        hint: (
          <>
            Last four characters:{" "}
            <span className="font-semibold text-zinc-300">8f2a</span>
          </>
        ),
        value: "GOCSPX-u83kqZ90184mQla8fZk29-8f2a",
        secret: true,
      },
    ],
    redirectHelper:
      "Whitelist this endpoint in your Google Cloud Console credential manager:",
    redirectUri: "https://taskflow.kairopro.app/api/auth/callback/google",
  },
  {
    id: "stripe",
    name: "Stripe",
    vars: "STRIPE_SECRET_KEY",
    status: "connected",
    configured: "yesterday",
    badge: <StripeMark className="h-3.5 w-3.5" />,
    envNames: ["STRIPE_SECRET_KEY"],
    fields: [
      {
        id: "stripe-secret",
        label: "Secret Key",
        hint: (
          <>
            Last four characters:{" "}
            <span className="font-semibold text-zinc-300">9f2c</span>
          </>
        ),
        value: "sk_live_51M8kairoPro2vXq99f2c",
        secret: true,
      },
    ],
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    vars: "SENDGRID_API_KEY",
    status: "unconfigured",
    configured: "—",
    badge: <Mail className="h-4 w-4 text-[#009DD9]" />,
    envNames: ["SENDGRID_API_KEY"],
    fields: [
      {
        id: "sendgrid-key",
        label: "API Key",
        hint: "Full access token",
        value: "",
        secret: true,
      },
    ],
  },
  {
    id: "aws",
    name: "AWS S3",
    vars: "AWS_ACCESS_KEY_ID & SECRET",
    status: "unused",
    configured: "—",
    badge: <Cloud className="h-4 w-4 text-[#FF9900]" />,
    envNames: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    fields: [
      {
        id: "aws-access",
        label: "Access Key ID",
        hint: "IAM long-lived credentials",
        value: "",
      },
      {
        id: "aws-secret",
        label: "Secret Access Key",
        hint: "Paired with the access key ID",
        value: "",
        secret: true,
      },
    ],
  },
];

function StatusChip({ status }: { status: ServiceStatus }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono-tech text-[10px] font-semibold";
  if (status === "connected") {
    return (
      <span
        className={cn(
          base,
          "border-brand-green/30 bg-brand-green/20 text-brand-green",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
        Connected
      </span>
    );
  }
  if (status === "unconfigured") {
    return (
      <span
        className={cn(
          base,
          "border-amber-500/30 bg-amber-500/10 text-amber-400",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Not configured
      </span>
    );
  }
  return (
    <span
      className={cn(base, "border-white/[0.08] bg-white/[0.08] text-zinc-500")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      Not used
    </span>
  );
}

export function CredentialsSettings() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [managing, setManaging] = useState<string | null>("google");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [savedService, setSavedService] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const managedService = services.find((s) => s.id === managing) ?? null;

  const copyValue = (key: string, value: string) => {
    if (!value) return;
    try {
      navigator.clipboard.writeText(value);
    } catch {}
    setCopied((prev) => ({ ...prev, [key]: true }));
    timers.current.push(
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 1500),
    );
  };

  const setFieldValue = (serviceId: string, fieldId: string, value: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id !== serviceId
          ? service
          : {
              ...service,
              fields: service.fields.map((field) =>
                field.id === fieldId ? { ...field, value } : field,
              ),
            },
      ),
    );
  };

  const saveService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? { ...service, status: "connected", configured: "just now" }
          : service,
      ),
    );
    setSavedService(serviceId);
    timers.current.push(setTimeout(() => setSavedService(null), 1800));
  };

  const removeService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              status: "unconfigured",
              configured: "—",
              fields: service.fields.map((field) => ({
                ...field,
                value: "",
              })),
            }
          : service,
      ),
    );
    setManaging(null);
  };

  return (
    <div className="flex w-full max-w-[840px] flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut" },
        }}
        className="flex flex-col justify-between gap-3 pb-1 sm:flex-row sm:items-start"
      >
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-1.5">
            <span className="font-mono-tech text-[10px] font-semibold uppercase text-zinc-500">
              Target Context:
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 font-mono-tech text-[11px] text-zinc-100 transition-colors hover:border-white/[0.2]"
            >
              <span className="h-2 w-2 rounded-full bg-brand-cyan" />
              <span className="font-semibold tracking-tight">TaskFlow</span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            </button>
            <span className="rounded-[2px] border border-brand-purple-light/20 bg-brand-purple/20 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase text-brand-purple-light">
              Project Scope
            </span>
          </div>
          <h1 className="mt-0.5 text-[20px] font-semibold leading-7 tracking-tight text-zinc-100">
            Service credentials
          </h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-zinc-300">
            Keys are encrypted at rest with hardware HSM and dynamically
            injected as environment variables during runtime execution. Raw
            credentials are never committed into repository source trees.
          </p>
        </div>
        <div className="shrink-0 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/[0.1] bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-zinc-100 shadow-sm transition-all hover:bg-white/[0.1] active:bg-white/[0.14]"
          >
            <CirclePlus className="h-4 w-4 text-brand-purple-light" />
            Add service
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: 0.06 },
        }}
        className="overflow-hidden rounded-[4px] border border-white/[0.06] bg-white/[0.03]"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.04] font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Configured</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="group border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3 font-medium text-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border border-white/[0.1] bg-white/[0.08]">
                        {service.badge}
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold leading-tight text-zinc-100">
                          {service.name}
                        </div>
                        <div className="font-mono-tech text-[11px] text-zinc-500">
                          {service.vars}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={service.status} />
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 font-mono-tech text-[11px]",
                      service.configured === "—"
                        ? "text-zinc-500"
                        : "text-zinc-300",
                    )}
                  >
                    {service.configured}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {service.status === "connected" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setManaging((current) =>
                            current === service.id ? null : service.id,
                          )
                        }
                        className="inline-flex items-center rounded-[2px] border border-white/[0.08] px-2.5 py-1 font-mono-tech text-[11px] font-medium text-zinc-100 transition-colors hover:bg-white/[0.05]"
                      >
                        {managing === service.id ? "Close" : "Manage"}
                      </button>
                    ) : service.status === "unconfigured" ? (
                      <button
                        type="button"
                        onClick={() => setManaging(service.id)}
                        className="inline-flex items-center rounded-[2px] border border-brand-purple-light/30 px-2.5 py-1 font-mono-tech text-[11px] font-semibold text-brand-purple-light transition-colors hover:bg-brand-purple-light/20"
                      >
                        + Add key
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setManaging(service.id)}
                        className="inline-flex items-center rounded-[2px] border border-white/[0.08] px-2.5 py-1 font-mono-tech text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                      >
                        Add key
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence initial={false} mode="wait">
        {managedService && (
          <motion.div
            key={managedService.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: 0.22, ease: "easeIn" },
            }}
            className="overflow-hidden"
          >
            <div className="overflow-hidden rounded-[4px] border border-brand-purple-light/40 bg-white/[0.03] shadow-md">
              <div className="flex flex-col justify-between gap-2 border-b border-white/[0.08] bg-white/[0.05] p-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-white/[0.1] bg-white/[0.08]">
                    {managedService.badge}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-zinc-100">
                        {managedService.name} Configuration
                      </span>
                      <StatusChip status={managedService.status} />
                    </div>
                    <p className="mt-0.5 font-mono-tech text-[11px] text-zinc-500">
                      Injected as{" "}
                      {managedService.envNames.map((name, i) => (
                        <span key={name}>
                          {i > 0 && " & "}
                          <span className="font-medium text-brand-purple-light">
                            {name}
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono-tech text-[10px] font-medium text-zinc-500">
                  <Lock className="h-[15px] w-[15px] text-brand-green" />
                  AES-256-GCM Vault
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4">
                {managedService.fields.map((field) => {
                  const isRevealed = revealed[field.id] ?? false;
                  const isCopied = copied[field.id] ?? false;
                  return (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <label className="flex items-center justify-between text-[12px] font-semibold text-zinc-100">
                        <span>{field.label}</span>
                        <span className="font-mono-tech text-[10px] font-normal text-zinc-500">
                          {field.hint}
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={
                            isRevealed || !field.secret ? "text" : "password"
                          }
                          value={field.value}
                          onChange={(e) =>
                            setFieldValue(
                              managedService.id,
                              field.id,
                              e.target.value,
                            )
                          }
                          placeholder={
                            field.value ? undefined : "Paste value to configure"
                          }
                          className={cn(
                            "w-full rounded-[2px] border border-white/[0.15] bg-brand-dark py-2 pl-3 pr-20 font-mono-tech text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 selection:bg-brand-purple/40 focus:border-brand-purple-light",
                            field.secret ? "tracking-widest" : "tracking-wider",
                          )}
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                          <button
                            type="button"
                            title="Toggle reveal"
                            onClick={() =>
                              setRevealed((prev) => ({
                                ...prev,
                                [field.id]: !isRevealed,
                              }))
                            }
                            className="rounded-[2px] p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
                          >
                            {isRevealed ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            title={`Copy ${field.label}`}
                            onClick={() => copyValue(field.id, field.value)}
                            className={cn(
                              "rounded-[2px] p-1.5 transition-colors hover:bg-white/[0.08]",
                              isCopied
                                ? "text-brand-green"
                                : "text-zinc-500 hover:text-zinc-100",
                            )}
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {managedService.redirectUri && (
                  <div className="flex flex-col justify-between gap-2 rounded-[2px] border border-white/[0.08] bg-white/[0.04] p-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Route className="h-[15px] w-[15px] text-brand-cyan" />
                        <span className="text-[12px] font-medium text-zinc-100">
                          Authorized redirect URI
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {managedService.redirectHelper}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/[0.1] bg-brand-dark px-2 py-1">
                      <span className="max-w-[280px] select-all truncate font-mono-tech text-[11px] text-brand-cyan sm:max-w-[340px]">
                        {managedService.redirectUri}
                      </span>
                      <button
                        type="button"
                        title="Copy Redirect URI"
                        onClick={() =>
                          copyValue(
                            "redirect",
                            managedService.redirectUri ?? "",
                          )
                        }
                        className={cn(
                          "p-1 transition-colors",
                          copied.redirect
                            ? "text-brand-green"
                            : "text-zinc-500 hover:text-zinc-100",
                        )}
                      >
                        {copied.redirect ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                  <button
                    type="button"
                    onClick={() => removeService(managedService.id)}
                    className="inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setManaging(null)}
                      className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveService(managedService.id)}
                      className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-[2px] bg-brand-purple px-5 py-1.5 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-brand-purple/85 active:scale-[0.99]"
                    >
                      {savedService === managedService.id ? (
                        <>
                          <Check className="h-4 w-4 text-brand-green" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save credentials
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay: 0.12 },
        }}
        className="flex items-start gap-3 rounded-[4px] border border-white/[0.05] bg-white/[0.03] p-3"
      >
        <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-brand-purple-light" />
        <div className="flex flex-col gap-1">
          <h3 className="text-[12px] font-semibold text-zinc-100">
            Dynamic Agent Token Distribution
          </h3>
          <p className="text-[12px] leading-normal text-zinc-500">
            Autonomous agent subroutines request ephemeral tokens scoped
            exclusively to authorized tools. Raw keys remain shielded inside the
            secure enclave (
            <span className="font-mono-tech text-zinc-300">
              /proc/sys/kairo-vault
            </span>
            ) and are automatically rotated every 30 days.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
