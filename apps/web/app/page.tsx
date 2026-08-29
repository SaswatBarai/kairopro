import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Code2, Globe, CheckCircle } from "lucide-react";

const features = [
  { icon: Sparkles, label: "AI Requirements", desc: "Turn a paragraph into a full PRD" },
  { icon: Code2, label: "Code Generation", desc: "Full-stack code, file by file" },
  { icon: Zap, label: "Live Sandbox", desc: "Run, test, and iterate in-browser" },
  { icon: Globe, label: "One-click Deploy", desc: "Ship to production instantly" },
];

const steps = [
  "Describe your idea",
  "AI generates PRD + Architecture",
  "Agent writes the code",
  "Review, test, deploy",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-secondary/8 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-black text-white text-base shadow-lg shadow-primary/30">
            K
          </div>
          <span className="font-extrabold text-lg tracking-tight">KairoPro</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
              Get started free <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-28 px-6 text-center max-w-5xl mx-auto">
        <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-xs font-medium border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3" /> Powered by DeepSeek AI
        </Badge>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
          <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Describe it.
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary via-violet-400 to-secondary bg-clip-text text-transparent">
            Build it.
          </span>
          <br />
          <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Ship it.
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          KairoPro transforms your idea into a fully deployed, production-ready application —
          from requirements to code to cloud, all in one AI-powered platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 text-base h-12 px-8">
              Start building for free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base h-12 px-8">
              Sign in to workspace
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="group p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:bg-card/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="font-semibold text-sm text-foreground mb-1">{label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">How it works</div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-card/60 border border-border/60 rounded-full px-4 py-2 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                {step}
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block mx-1" />}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          All systems operational
        </div>
      </footer>
    </div>
  );
}
