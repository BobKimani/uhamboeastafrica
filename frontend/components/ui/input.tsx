import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-12 w-full rounded-xl bg-surface-container-highest px-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-xl bg-surface-container-highest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-bold uppercase tracking-widest text-on-surface-variant",
        className
      )}
      {...props}
    />
  );
}
