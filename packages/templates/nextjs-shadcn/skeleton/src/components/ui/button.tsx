import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-neutral-900 text-white hover:bg-neutral-800",
  outline: "border border-neutral-300 bg-transparent hover:bg-neutral-100",
  ghost: "hover:bg-neutral-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
} as const;

const sizes = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-base",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
