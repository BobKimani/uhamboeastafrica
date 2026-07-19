import Image from "next/image";
import Link from "next/link";
import { COUNTRIES } from "@/lib/data/countries";
import { SectionHeader } from "@/components/shared/section-header";

export function CountryBentoGrid() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
      <SectionHeader
        eyebrow="Destinations"
        title="The Pearl of the Continent"
        description="Four countries. One shared horizon. Choose your starting point."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-14">
        {COUNTRIES.map((c) => (
          <Link
            key={c.slug}
            href={`/destinations?country=${c.slug}`}
            className="group relative aspect-3/2 overflow-hidden rounded-2xl bg-surface-container-low"
          >
            <Image
              src={c.image}
              alt={c.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="text-primary-fixed font-headline font-bold text-[10px] tracking-widest uppercase block mb-1">
                Region
              </span>
              <h3 className="text-white font-headline text-3xl md:text-4xl font-extrabold tracking-tight">
                {c.name}
              </h3>
              <p className="text-white/70 text-sm mt-2 max-w-md">{c.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
