import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="KairoPro"
      className={cn("h-6 w-6", className)}
    >
      <title>KairoPro</title>
      <rect
        width="32"
        height="32"
        rx="6"
        fill="#12121A"
        stroke="#26262F"
        strokeWidth="1.5"
      />
      <path
        d="M8 8V24M8 16L18 8M18 24L10 16"
        stroke="#6D5EF5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="16" r="2.5" fill="#22D3EE" />
    </svg>
  );
}
