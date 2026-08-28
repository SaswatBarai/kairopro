export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold text-xl mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to your KairoPro account</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <p className="text-center text-slate-500 text-sm">
            Authentication UI coming in Phase 2
          </p>
        </div>
      </div>
    </main>
  );
}
