import { FadeIn } from "@/components/landing/fade-in";

const kw = "text-brand-purple";
const fn = "text-brand-cyan";
const str = "text-emerald-300";

export function CodeShowcase() {
  return (
    <section className="mx-auto max-w-6xl border-t border-white/[0.06] px-6 py-20">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <FadeIn className="lg:col-span-5">
          <span className="font-mono-tech text-xs font-semibold uppercase tracking-widest text-emerald-400">
            PRODUCTION-GRADE TYPESCRIPT
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
            Readable code, authored to your team&apos;s standard.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Every handler is typed with Zod schemas, structured with appropriate
            HTTP status codes, and checked against your database relations.
          </p>
          <div className="mt-6 space-y-2 font-mono-tech text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Next.js 14.2 App Router Route Handlers</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Prisma ORM transactions &amp; connection pooling</span>
            </div>
          </div>
        </FadeIn>

        {/* Code editor display */}
        <FadeIn className="lg:col-span-7" delay={0.1}>
          <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-brand-surface font-mono-tech text-xs shadow-xl">
            <div className="flex h-9 items-center justify-between border-b border-white/[0.06] bg-brand-surface-muted px-4">
              <span className="text-[#e4e1e9]">src/app/api/tasks/route.ts</span>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                COMPILED (42ms)
              </span>
            </div>
            <div className="overflow-x-auto p-4 text-[12px] leading-relaxed text-zinc-400">
              <p>
                <span className={kw}>import</span> {"{ NextResponse }"}{" "}
                <span className={kw}>from</span>{" "}
                <span className={str}>&apos;next/server&apos;</span>;
              </p>
              <p>
                <span className={kw}>import</span> {"{ prisma }"}{" "}
                <span className={kw}>from</span>{" "}
                <span className={str}>&apos;@/lib/prisma&apos;</span>;
              </p>
              <p>
                <span className={kw}>import</span> {"{ z }"}{" "}
                <span className={kw}>from</span>{" "}
                <span className={str}>&apos;zod&apos;</span>;
              </p>
              <p>
                <span className={kw}>import</span> {"{ requireSession }"}{" "}
                <span className={kw}>from</span>{" "}
                <span className={str}>&apos;@/lib/auth&apos;</span>;
              </p>
              <br />
              <p>
                <span className={kw}>export async function</span>{" "}
                <span className={fn}>POST</span>(req: Request) {"{"}
              </p>
              <p className="pl-4">
                <span className={kw}>const</span> session ={" "}
                <span className={kw}>await</span>{" "}
                <span className={fn}>requireSession</span>();
              </p>
              <p className="pl-4">
                <span className={kw}>const</span> body ={" "}
                <span className={kw}>await</span> req.<span className={fn}>json</span>();
              </p>
              <p className="pl-4 text-zinc-500">
                {"// Auto-injected validation schema derived from spec"}
              </p>
              <p className="pl-4">
                <span className={kw}>const</span> task ={" "}
                <span className={kw}>await</span> prisma.task.
                <span className={fn}>create</span>({"{"}
              </p>
              <p className="pl-8">data: {"{"}</p>
              <p className="pl-12">title: body.title,</p>
              <p className="pl-12">priority: body.priority,</p>
              <p className="pl-12">tenantId: session.orgId</p>
              <p className="pl-8">{"}"}</p>
              <p className="pl-4">{"});"}</p>
              <p className="pl-4">
                <span className={kw}>return</span> NextResponse.
                <span className={fn}>json</span>(task, {"{"} status: 201 {"}"});
              </p>
              <p>{"}"}</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
