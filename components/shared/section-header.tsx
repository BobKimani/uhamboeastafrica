import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="text-primary font-bold tracking-widest uppercase text-xs">
          {eyebrow}
        </span>
      )}
      <h2 className="font-headline text-4xl md:text-5xl font-extrabold mt-4 text-on-surface tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-secondary mt-4 text-lg leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
