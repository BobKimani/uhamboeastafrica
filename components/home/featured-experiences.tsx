import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MoveRight } from "lucide-react";
import { EXPERIENCES } from "@/lib/data/experiences";
import { Badge } from "@/components/ui/badge";

export function FeaturedExperiences() {
  const featured = EXPERIENCES.slice(0, 3);
  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-14 gap-8">
        <div className="max-w-2xl">
          <span className="text-primary font-bold tracking-widest uppercase text-xs">
            The Curated Collection
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mt-4 text-on-surface tracking-tight">
            Memories Written in the Sand
          </h2>
        </div>
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 text-primary font-bold border-b border-primary/30 pb-1 hover:border-primary transition-colors"
        >
          View All Experiences <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {featured.map((e) => (
          <Link key={e.id} href="/experiences" className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-2xl aspect-[4/5] mb-5">
              <Image
                src={e.image}
                alt={e.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4">
                <Badge tone="primary">{e.category}</Badge>
              </div>
            </div>
            <h4 className="font-headline text-xl font-bold text-on-surface">
              {e.title}
            </h4>
            <p className="text-secondary mt-1 text-sm">
              {e.duration} • {e.location}
            </p>
            <div className="mt-4 flex items-center gap-2 text-primary font-bold">
              Explore <MoveRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
