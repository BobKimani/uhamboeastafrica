import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "secondary" | "tertiary" | "success" | "warning";

const tones: Record<Tone, string> = {
  primary: "bg-primary/90 text-white",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  success: "bg-primary/10 text-primary",
  warning: "bg-error-container text-on-error-container",
};

export function Badge({
  tone = "secondary",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
