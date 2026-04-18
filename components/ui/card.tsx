import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-2xl overflow-hidden transition-all duration-300",
        className
      )}
      {...props}
    />
  );
}
