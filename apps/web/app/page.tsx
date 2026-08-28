import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-xl">
          K
        </div>
        <span className="text-2xl font-bold tracking-tight">KairoPro</span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
        Describe it.
        <br />
        Build it.
        <br />
        Ship it.
      </h1>

      <p className="text-lg md:text-xl text-slate-400 text-center max-w-2xl mb-12">
        KairoPro transforms your idea into a fully deployed, production-ready
        application — from requirements to code to cloud, powered by AI.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/login"
          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-white shadow-lg shadow-indigo-500/20"
        >
          Get started for free
        </Link>
        <Link
          href="/login"
          className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-semibold text-white backdrop-blur-sm border border-white/10"
        >
          Sign in
        </Link>
      </div>

      {/* Status */}
      <div className="mt-20 text-slate-600 text-sm">
        Platform status: <span className="text-emerald-400 font-medium">● All systems operational</span>
      </div>
    </main>
  );
}
