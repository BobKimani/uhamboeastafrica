import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-bold tracking-wide transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variants: Record<Variant, string> = {
  primary:
    "sunset-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:opacity-95",
  secondary:
    "bg-surface-container-highest text-on-surface hover:bg-surface-container-high",
  tertiary:
    "text-primary hover:text-primary-container underline decoration-primary/30 underline-offset-4 hover:decoration-primary",
  ghost: "text-on-surface hover:bg-surface-container-low",
  outline:
    "bg-transparent text-on-surface hover:bg-surface-container-low border border-outline-variant/30",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs rounded-xl",
  md: "h-11 px-6 text-sm rounded-xl",
  lg: "h-14 px-10 text-base rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
