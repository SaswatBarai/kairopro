import { Logo } from "@/components/common/logo";

const footerLinks = [
  { label: "Product", href: "#compiler" },
  { label: "How it works", href: "#spec-to-software" },
  { label: "Architecture", href: "#architecture" },
  { label: "Engineering", href: "#principles" },
  { label: "Docs", href: "#" },
  { label: "GitHub", href: "https://github.com", external: true },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-brand-dark py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-xs md:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo className="h-5 w-5" />
          <span className="font-medium text-zinc-100">KairoPro</span>
          <span className="ml-2 text-zinc-500">
            Autonomous Full-Stack Compiler
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              className="transition-colors hover:text-zinc-100"
              href={link.href}
              {...("external" in link && link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="font-mono-tech text-[11px] text-zinc-500">
          © 2025 KairoPro Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
