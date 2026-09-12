"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Check, Copy, FileText } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const destinations = [
  { route: "/features", label: "Platform specs", href: "/features" },
  { route: "/pricing", label: "Compute tiers", href: "/pricing" },
  { route: "/docs/routing", label: "Routing guides", href: "#" },
  {
    route: "github.com",
    label: "Open source",
    href: "https://github.com",
    external: true,
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

const logContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.22, delayChildren: 0.55 } },
};

const logItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function NotFoundPage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState(false);

  const displayPath =
    mounted && pathname && pathname !== "/" ? pathname : "/requested-route";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setTyped(displayPath.slice(0, index));
      if (index >= displayPath.length) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [displayPath]);

  const onCopyTrace = async () => {
    const trace = [
      "kairopro-router v3.18.2 --trace-route",
      `GET ${displayPath} HTTP/2.0`,
      "[error] No handler registered in Next.js App Router tree.",
      "[status] 404 NOT_FOUND",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(trace);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-hidden pt-[92px]">
        <section className="relative flex min-h-[calc(100dvh-220px)] w-full flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#474555_1px,transparent_1px),linear-gradient(to_bottom,#474555_1px,transparent_1px)] [background-size:32px_32px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full"
          >
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.75, 0.4],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-full rounded-full bg-brand-purple/10 blur-[120px]"
            />
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center"
          >
            <motion.div variants={item}>
              <Badge variant="rose" mono className="gap-1.5 px-2.5 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                ERR_404 // ROUTE_NOT_RESOLVED
              </Badge>
            </motion.div>

            <motion.h1
              variants={item}
              className="mb-2 mt-6 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl"
            >
              This route does not exist.
            </motion.h1>

            <motion.p
              variants={item}
              className="mb-8 max-w-md text-sm leading-relaxed text-zinc-400"
            >
              The requested endpoint could not be found in the current
              deployment manifest. It may have been deprecated, relocated, or
              never compiled into the active routing tree.
            </motion.p>

            <motion.div variants={item} className="mb-8 w-full">
              <Card className="gap-0 overflow-hidden rounded-lg border-white/[0.08] bg-brand-dark py-0 text-left shadow-2xl shadow-black/40">
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.06] bg-brand-surface-muted px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="font-mono-tech text-[11px] text-zinc-400">
                      kairopro-router v3.18.2 --trace-route
                    </span>
                  </div>
                  <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                    Env: production
                  </span>
                </CardHeader>

                <CardContent className="px-4 py-4 font-mono-tech text-xs leading-relaxed">
                  <motion.div
                    variants={logContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-1.5"
                  >
                    <motion.div
                      variants={logItem}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                        01
                      </span>
                      <div className="flex-1">
                        <span className="text-brand-cyan">GET</span>{" "}
                        <span className="font-semibold text-zinc-100">
                          {typed}
                        </span>
                        {typed === displayPath && (
                          <>
                            {" "}
                            <span className="text-zinc-600">HTTP/2.0</span>
                          </>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      variants={logItem}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                        02
                      </span>
                      <div className="flex-1 text-zinc-500">
                        <span className="font-medium text-brand-purple-light">
                          [lookup]
                        </span>{" "}
                        scanning app-router-manifest.json ...
                      </div>
                    </motion.div>

                    <motion.div
                      variants={logItem}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                        03
                      </span>
                      <div className="flex-1 text-rose-400/90">
                        <span className="font-semibold text-rose-400">
                          [error]
                        </span>{" "}
                        No handler registered in Next.js App Router tree.
                      </div>
                    </motion.div>

                    <motion.div
                      variants={logItem}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                        04
                      </span>
                      <div className="flex-1 text-zinc-400">
                        <span className="font-medium text-zinc-500">
                          [trace]
                        </span>{" "}
                        tested: src/app/(marketing)/...{" "}
                        <span className="text-rose-400">[not_found]</span>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={logItem}
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                        05
                      </span>
                      <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        <span className="font-medium text-rose-400">
                          [status]
                        </span>
                        <Badge variant="rose" mono>
                          404 NOT_FOUND
                        </Badge>
                        <span className="text-zinc-600">
                          (execution time: 3.8ms)
                        </span>
                        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-brand-cyan" />
                      </div>
                    </motion.div>
                  </motion.div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-white/[0.06] bg-brand-surface-muted px-4 py-2">
                  <div className="flex items-center gap-1.5 font-mono-tech text-[11px]">
                    <span className="text-zinc-500">cluster:</span>
                    <span className="text-zinc-200">us-east-1-core</span>
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={onCopyTrace}
                    className="gap-1 font-mono-tech text-[11px] text-brand-cyan hover:text-brand-purple-light"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-brand-green" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className={copied ? "text-brand-green" : undefined}>
                      {copied ? "Copied!" : "Copy trace"}
                    </span>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div
              variants={item}
              className="mb-8 flex w-full flex-col items-center justify-center gap-2 sm:flex-row"
            >
              <Button asChild className="w-full gap-2 sm:w-auto">
                <a href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Return to root /
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full gap-2 sm:w-auto"
              >
                <a href="#">
                  <FileText className="h-4 w-4" />
                  Read the docs
                </a>
              </Button>
            </motion.div>

            <motion.div
              variants={item}
              className="w-full rounded-lg border border-white/[0.08] bg-brand-surface p-4"
            >
              <div className="mb-2 flex items-center justify-between text-left font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                <span>Valid Destinations</span>
                <span>HTTP_STATUS_RESOLVED</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {destinations.map((destination) => (
                  <a
                    key={destination.route}
                    href={destination.href}
                    {...("external" in destination && destination.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    className="group flex flex-col items-start rounded-[3px] bg-brand-surface-muted p-2.5 text-left transition-colors hover:bg-[#1b1b22]"
                  >
                    <span className="font-mono-tech text-[11px] text-brand-cyan transition-colors group-hover:text-brand-purple-light">
                      {destination.route}
                    </span>
                    <span className="mt-0.5 truncate text-xs text-zinc-400">
                      {destination.label}
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={item}
              className="mt-6 flex items-center justify-center gap-4 font-mono-tech text-[11px] text-zinc-400"
            >
              <span className="flex items-center gap-1.5 text-brand-green">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                Edge gateways operational
              </span>
              <span aria-hidden="true" className="text-zinc-700">
                |
              </span>
              <a
                href="#"
                className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100"
              >
                System Status 99.99%
              </a>
            </motion.div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
