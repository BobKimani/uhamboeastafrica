import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Experience } from "@/lib/data/experiences";
import { cn } from "@/lib/utils";

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Card className="border border-outline-variant/15 flex flex-col overflow-hidden group">
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={experience.image}
          alt={experience.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
        <Badge tone="primary" className="absolute top-4 left-4">
          {experience.category}
        </Badge>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-4 text-on-surface-variant text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {experience.duration}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {experience.location}
          </span>
        </div>
        <h3 className="text-on-surface font-headline font-extrabold text-xl mt-3">
          {experience.title}
        </h3>
        <p className="text-on-surface-variant text-sm mt-3 leading-relaxed line-clamp-3 flex-1">
          {experience.description}
        </p>
        <div className="mt-6">
          <Link
            href="/plan-trip"
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "sunset-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:opacity-95"
            )}
          >
            Take me there
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </Card>
  );
}
