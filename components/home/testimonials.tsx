import { Star } from "lucide-react";
import { TESTIMONIALS } from "@/lib/data/faqs";
import { SectionHeader } from "@/components/shared/section-header";

export function Testimonials() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
      <SectionHeader
        align="center"
        eyebrow="Travelers' Voices"
        title="Stories From the Savanna"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="bg-surface-container-low rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex gap-1 mb-5 text-primary">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-on-surface text-lg leading-relaxed mb-6">
              &ldquo;{t.text}&rdquo;
            </p>
            <p className="font-headline font-bold text-sm text-primary">
              — {t.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
