import React from "react";

export const metadata = {
  title: "Dashboard — KairoPro",
  description: "Manage your AI-generated applications",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {children}
    </div>
  );
}
