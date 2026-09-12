import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  eyebrowClassName,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  eyebrowClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-12",
        align === "center" && "mx-auto max-w-3xl text-center",
        className,
      )}
    >
      <span
        className={cn(
          "font-mono-tech text-xs font-semibold uppercase tracking-widest text-brand-purple",
          eyebrowClassName,
        )}
      >
        {eyebrow}
      </span>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-2 text-sm text-zinc-400 sm:text-base",
            align === "center" && "mt-3",
            !align && "max-w-xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
