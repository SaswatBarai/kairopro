import { Logo } from "@/components/common/logo";

const footerLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  {
    label: "GitHub",
    href: "https://github.com",
    external: true,
  },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-brand-dark py-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-6 md:grid-cols-3">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 md:justify-start">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-medium text-zinc-100">KairoPro</span>
        </div>

        {/* Centered links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono-tech text-xs text-zinc-500">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              className="transition-colors hover:text-zinc-200"
              href={link.href}
              {...("external" in link && link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Copyright */}
        <div className="text-center font-mono-tech text-[11px] text-zinc-600 md:text-right">
          © 2025 KairoPro Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
