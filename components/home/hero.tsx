import Image from "next/image";
import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { IMG } from "@/lib/images";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative h-[92vh] min-h-[640px] w-full flex items-center justify-center overflow-hidden -mt-20">
      <div className="absolute inset-0">
        <Image
          src={IMG.heroSavanna}
          alt="East African savanna at sunset with lone acacia tree"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 cinematic-overlay" />
      </div>
      <div className="relative z-10 text-center px-6 max-w-5xl pt-20">
        <span className="inline-block text-primary-fixed font-headline font-bold tracking-widest uppercase text-xs mb-6">
          The Breath of the Savanna
        </span>
        <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight mb-6 leading-[0.95]">
          Explore East Africa,
          <br />
          <span className="text-primary-fixed">Your Way</span>
        </h1>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Tailored safaris, seamless transport and curated stays across Kenya,
          Tanzania, Uganda and Rwanda, handcrafted by local experts.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/plan-trip">
            <Button size="lg">
              Plan My Trip <Compass className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/transport">
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            >
              Book Transport <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
