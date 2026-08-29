"use client";

import { useEffect, useRef } from "react";
import { LayoutDashboard, Users, Settings, Bell, Search, Activity, ArrowUpRight } from "lucide-react";

export function DesignPreview({ designSpec }: { designSpec: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !designSpec) return;

    const el = containerRef.current;
    const colors = designSpec.colors || {};
    
    // Inject dynamic CSS variables into the container
    el.style.setProperty("--color-primary", colors.primary || "#4F46E5");
    el.style.setProperty("--color-secondary", colors.secondary || "#10B981");
    el.style.setProperty("--color-bg", colors.dark?.background || colors.background || "#0F172A");
    el.style.setProperty("--color-surface", colors.dark?.surface || colors.surface || "#1E293B");
    el.style.setProperty("--color-text", colors.dark?.text || colors.text || "#F8FAFC");
    el.style.setProperty("--font-family", designSpec.typography?.fontFamily || "Inter, sans-serif");
    
    const radius = designSpec.borderRadius?.md || "0.5rem";
    el.style.setProperty("--radius-md", radius);
    el.style.setProperty("--radius-lg", designSpec.borderRadius?.lg || "0.75rem");

  }, [designSpec]);

  return (
    <div 
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative"
      style={{
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-family)",
        height: "600px"
      }}
    >
      {/* Fake App Navbar */}
      <div 
        className="h-16 border-b flex items-center justify-between px-6"
        style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 flex items-center justify-center text-white font-bold" style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-md)" }}>
            K
          </div>
          Dashboard
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-4 h-4 opacity-50" />
          <Bell className="w-4 h-4 opacity-50" />
          <div className="w-8 h-8 bg-slate-700 rounded-full border-2" style={{ borderColor: "var(--color-primary)" }} />
        </div>
      </div>

      <div className="flex h-[calc(100%-4rem)]">
        {/* Fake App Sidebar */}
        <div className="w-64 border-r p-4 space-y-2 hidden md:block" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            {[
                { icon: <LayoutDashboard />, label: "Overview", active: true },
                { icon: <Users />, label: "Customers", active: false },
                { icon: <Activity />, label: "Analytics", active: false },
                { icon: <Settings />, label: "Settings", active: false },
            ].map((item, i) => (
                <div 
                    key={i} 
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                    style={{
                        backgroundColor: item.active ? "var(--color-primary)" : "transparent",
                        color: item.active ? "#ffffff" : "inherit",
                        opacity: item.active ? 1 : 0.7,
                        borderRadius: "var(--radius-md)"
                    }}
                >
                    <span className="w-4 h-4">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                </div>
            ))}
        </div>

        {/* Fake App Content */}
        <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Welcome back, Team</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map(i => (
                    <div 
                        key={i}
                        className="p-6 border"
                        style={{
                            backgroundColor: "var(--color-surface)",
                            borderColor: "rgba(255,255,255,0.05)",
                            borderRadius: "var(--radius-lg)"
                        }}
                    >
                        <div className="text-sm opacity-60 mb-2">Metric {i}</div>
                        <div className="text-3xl font-bold mb-4">$42,000</div>
                        <div className="text-xs flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
                            <ArrowUpRight className="w-3 h-3" /> +12.5% this month
                        </div>
                    </div>
                ))}
            </div>

            <div 
                className="w-full p-6 border"
                style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "rgba(255,255,255,0.05)",
                    borderRadius: "var(--radius-lg)"
                }}
            >
                <h3 className="font-bold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "var(--color-primary)", opacity: 0.2 }} />
                                <div>
                                    <div className="text-sm font-medium">New User Signup</div>
                                    <div className="text-xs opacity-50">Just now</div>
                                </div>
                            </div>
                            <button 
                                className="px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-md)" }}
                            >
                                View
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      {/* Decorative Gradient Glow */}
      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ backgroundColor: "var(--color-primary)", transform: "translate(20%, -30%)" }}
      />
    </div>
  );
}
