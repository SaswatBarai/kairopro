"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, User } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Docs", href: "/docs" },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  label,
  href,
  onClick,
  mobile = false,
  active = false,
}: {
  label: string;
  href: string;
  onClick?: () => void;
  mobile?: boolean;
  active?: boolean;
}) {
  if (mobile) {
    return (
      <a
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center rounded-sm px-3 py-2.5 text-[15px] transition-colors",
          active
            ? "bg-brand-surface-muted/60 text-zinc-100"
            : "text-zinc-400 hover:bg-brand-surface-muted/60 hover:text-zinc-100",
        )}
      >
        {label}
      </a>
    );
  }
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative py-2 text-sm transition-colors duration-200",
        active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-[2px] origin-center bg-gradient-to-r from-brand-purple to-brand-cyan transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </a>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          "mx-auto max-w-[1080px] rounded-[3px] border transition-all duration-300",
          scrolled
            ? "border-white/[0.12] bg-[#0B0B0F]/85 backdrop-blur-xl"
            : "border-white/[0.08] bg-[#0B0B0F]",
        )}
      >
        <div className="flex h-[56px] items-stretch justify-between sm:h-[64px]">
          {/* Brand block */}
          <div className="flex items-center border-r border-white/[0.06] px-4 sm:px-6">
            <a className="group flex items-center gap-2.5" href="/">
              <Logo className="transition-transform duration-300 group-hover:scale-105" />
              <span className="text-base font-medium tracking-tight text-zinc-100">
                KairoPro
              </span>
            </a>
          </div>

          {/* Center navigation */}
          <nav className="hidden items-center gap-7 px-7 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={isActive(pathname, link.href)}
              />
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden items-center gap-4 border-l border-white/[0.08] px-5 lg:flex">
            <a
              aria-label="GitHub"
              className="flex items-center text-zinc-500 transition-colors duration-200 hover:text-zinc-200"
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  className="group h-[38px] rounded-[4px] bg-[#6d5ef5] px-4 text-[13px] font-medium text-white shadow-[0_4px_20px_rgba(109,94,245,0.25)] transition-all hover:bg-[#5b4be3]"
                >
                  <a href="/dashboard">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                </Button>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-brand-surface-muted text-zinc-400 hover:text-rose-400 hover:border-rose-400/40"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                asChild
                className="group h-[42px] -ml-1 rounded-[4px] px-5 text-[13px] shadow-[0_4px_20px_rgba(109,94,245,0.15)] transition-all duration-200 hover:-translate-y-px hover:bg-[#7B6EF6] hover:shadow-[0_6px_24px_rgba(109,94,245,0.22)]"
              >
                <a href="/login">
                  <span>Log in</span>
                  <span className="text-xs transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="my-auto mr-4 flex h-9 w-9 items-center justify-center rounded-[3px] border border-white/[0.08] text-zinc-300 transition-colors hover:border-white/[0.18] hover:text-zinc-100 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <div className="space-y-1.5">
              <span
                className={cn(
                  "block h-px w-4 bg-current transition-transform duration-200",
                  menuOpen && "translate-y-[3.5px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-4 bg-current transition-transform duration-200",
                  menuOpen && "-translate-y-[3.5px] -rotate-45",
                )}
              />
            </div>
          </button>
        </div>

        {/* Mobile panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden border-t border-white/[0.06] lg:hidden"
            >
              <div className="flex flex-col gap-0.5 px-3 py-4">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    mobile
                    active={isActive(pathname, link.href)}
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                  <a
                    aria-label="GitHub"
                    className="flex items-center gap-1.5 px-3 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GitHubIcon className="h-5 w-5" />
                  </a>
                  {session?.user ? (
                    <Button
                      asChild
                      className="group mt-1 rounded-[4px] bg-[#6d5ef5] px-5 text-[13px] text-white shadow-[0_4px_20px_rgba(109,94,245,0.25)]"
                    >
                      <a href="/dashboard" onClick={() => setMenuOpen(false)}>
                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                        <span>Dashboard</span>
                      </a>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="group mt-1 rounded-[4px] px-5 text-[13px] shadow-[0_4px_20px_rgba(109,94,245,0.15)]"
                    >
                      <a href="/login" onClick={() => setMenuOpen(false)}>
                        <span>Log in</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                          →
                        </span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
