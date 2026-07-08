import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Experience } from "@/lib/data/experiences";

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
      </div>
    </Card>
  );
}
