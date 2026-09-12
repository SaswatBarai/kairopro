import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60 disabled:pointer-events-none disabled:opacity-50 [&_span]:transition-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-purple text-white hover:bg-[#5C4EE5] shadow-[0_0_24px_rgba(109,94,245,0.45)] hover:shadow-[0_0_32px_rgba(109,94,245,0.65)]",
        outline:
          "bg-brand-surface border border-white/[0.1] text-brand-dark-foreground hover:border-white/[0.22] hover:bg-brand-surface-muted text-zinc-100",
        ghost: "text-zinc-400 hover:text-zinc-100",
      },
      size: {
        sm: "px-3.5 py-1.5 text-xs",
        md: "px-6 py-3",
        lg: "px-8 py-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as { className?: string };
    return React.cloneElement(
      children as React.ReactElement<{ className?: string }>,
      {
        ...props,
        className: cn(classes, childProps.className),
      },
    );
  }
  if (asChild) {
    return <a className={classes} {...(props as React.ComponentPropsWithoutRef<"a">)} />;
  }
  return <button className={classes} {...props}>{children}</button>;
}

export { Button, buttonVariants };
