"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { STEPS, StepSlug } from "@/lib/wizard/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WizardShell({
  stepSlug,
  title,
  subtitle,
  canContinue = true,
  onContinue,
  children,
}: {
  stepSlug: StepSlug;
  title: React.ReactNode;
  subtitle?: string;
  canContinue?: boolean;
  onContinue?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const index = STEPS.findIndex((s) => s.slug === stepSlug);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];
  const total = STEPS.length;
  const percent = ((index + 1) / total) * 100;

  const goNext = () => {
    onContinue?.();
    if (next) router.push(`/plan-trip/${next.slug}`);
    else router.push("/results");
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 md:px-10 max-w-5xl mx-auto flex flex-col items-center">
      <div className="w-full max-w-3xl mb-14">
        <div className="flex justify-between items-center mb-3">
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            Step {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="text-on-surface-variant text-xs tracking-wide">
            {STEPS[index].label}
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full sunset-gradient rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <header className="text-center mb-14 max-w-3xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tight text-on-background leading-[1.05]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-secondary text-lg md:text-xl mt-5 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </header>

      <div className="w-full mb-12">{children}</div>

      <div className="w-full flex items-center justify-between gap-4 pt-10 border-t border-outline-variant/15">
        {prev ? (
          <Link href={`/plan-trip/${prev.slug}`}>
            <Button variant="secondary" size="md">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        ) : (
          <Link href="/">
            <Button variant="ghost" size="md">
              Cancel
            </Button>
          </Link>
        )}
        <button
          onClick={goNext}
          disabled={!canContinue}
          className={cn(
            "inline-flex items-center gap-2 px-8 h-12 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none sunset-gradient text-white shadow-lg shadow-primary/20"
          )}
        >
          {next ? "Continue" : "Find My Trip"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
