import Link from "next/link";
import { Bus, Hotel, CalendarRange, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";

const SERVICES = [
  {
    icon: Bus,
    title: "Transport",
    description:
      "Seamless airport transfers, cross-border shuttles and private safari vehicles with experienced guides.",
    href: "/transport",
  },
  {
    icon: Hotel,
    title: "Accommodation",
    description:
      "Curated stays ranging from boutique eco-lodges in the savanna to high-end resorts on the coast.",
    href: "/plan-trip",
  },
  {
    icon: CalendarRange,
    title: "Custom Planning",
    description:
      "Personalised itineraries designed by local experts to match your pace, interests and travel style.",
    href: "/plan-trip",
  },
];

export function ServicesSection() {
  return (
    <section className="bg-surface-container-low py-24 md:py-32 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          align="center"
          eyebrow="Our Services"
          title="Tailored Experiences"
          description="From logistics to luxury stays, we manage every detail of your East African voyage."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {SERVICES.map(({ icon: Icon, title, description, href }) => (
            <Link
              key={title}
              href={href}
              className="group p-8 bg-surface rounded-2xl hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-14 h-14 sunset-gradient rounded-full flex items-center justify-center text-white mb-6">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-3 text-on-surface">
                {title}
              </h3>
              <p className="text-secondary leading-relaxed mb-6">
                {description}
              </p>
              <span className="inline-flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-3 transition-all">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
