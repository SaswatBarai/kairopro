import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border font-mono-tech font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-transparent text-zinc-400",
        cyan: "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
        green:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        purple: "border-transparent bg-brand-purple/10 text-brand-purple",
        outline: "border-white/[0.08] text-zinc-500",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
