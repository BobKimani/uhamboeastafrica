import { Accordion } from "@/components/ui/accordion";
import { FAQS } from "@/lib/data/faqs";
import { SectionHeader } from "@/components/shared/section-header";

export function FAQSection() {
  return (
    <section className="bg-surface-container-low py-24 md:py-32 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          align="center"
          eyebrow="Questions"
          title="Before You Go"
          description="Everything you need to know before stepping onto East African soil."
        />
        <div className="mt-14">
          <Accordion items={FAQS} />
        </div>
      </div>
    </section>
  );
}
