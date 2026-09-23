"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Compass, ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { IMG } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDE_MS = 7000;

const SLIDES = [
  { src: IMG.heroSavanna, place: "The Savanna", country: "Kenya", alt: "East African savanna at sunset with lone acacia tree", motion: "kb-in" },
  { src: IMG.serengeti, place: "Serengeti", country: "Tanzania", alt: "Open plains of the Serengeti", motion: "kb-left" },
  { src: IMG.tanzaniaZanzibar, place: "Zanzibar", country: "Tanzania", alt: "Turquoise water off the coast of Zanzibar", motion: "kb-right" },
  { src: IMG.ugandaGorilla, place: "Gorilla Highlands", country: "Uganda", alt: "Mountain gorilla in the Ugandan forest", motion: "kb-in" },
  { src: IMG.dianiBeach, place: "Diani Beach", country: "Kenya", alt: "White sand and palms on Diani Beach", motion: "kb-left" },
] as const;

function Birds() {
  // A small flock drifting across the sky; wings flap via CSS.
  const flock = [
    { x: 0, y: 0, s: 1, d: 0 },
    { x: 34, y: 14, s: 0.8, d: 0.15 },
    { x: 60, y: -6, s: 0.7, d: 0.3 },
    { x: 18, y: 30, s: 0.6, d: 0.45 },
    { x: 84, y: 20, s: 0.55, d: 0.1 },
  ];
  return (
    <div className="hero-flock pointer-events-none absolute top-[18%] left-0 z-[2]" aria-hidden="true">
      <svg width="120" height="60" viewBox="-10 -20 120 70" fill="none">
        {flock.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
            <path
              className="hero-wing"
              style={{ animationDelay: `${b.d}s` }}
              d="M0 6 Q6 -2 12 6 Q18 -2 24 6"
              stroke="rgba(20,16,12,0.75)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Hero() {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onVisibility = () => setPaused(document.hidden || reduce.matches);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => goTo((active + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused]);

  function goTo(index: number) {
    if (index === active) return;
    setPrevious(active);
    setActive(index);
  }

  const slide = SLIDES[active];

  return (
    <section
      className="relative h-[92vh] min-h-[640px] w-full flex items-center justify-center overflow-hidden -mt-20 bg-[#1b1c1a]"
      aria-roledescription="carousel"
      aria-label="East African destinations"
    >
      {/* Crossfading Ken Burns slides */}
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => {
          const isActive = i === active;
          const isLeaving = i === previous;
          return (
            <div
              key={s.src}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1600ms] ease-out",
                isActive ? "opacity-100 z-[1]" : isLeaving ? "opacity-0 z-0" : "opacity-0 -z-10"
              )}
              aria-hidden={!isActive}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                className={cn(
                  "object-cover will-change-transform",
                  (isActive || isLeaving) && `hero-${s.motion}`,
                  paused && "hero-paused"
                )}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 z-[2] cinematic-overlay" />
        {/* Warm golden-hour glow drifting across the frame */}
        <div className="hero-glow absolute -inset-1/4 z-[2] pointer-events-none" aria-hidden="true" />
        <div className="hero-grain absolute inset-0 z-[2] pointer-events-none" aria-hidden="true" />
      </div>

      <Birds />

      {/* Copy */}
      <div className="relative z-10 text-center px-6 max-w-5xl pt-20">
        <span
          className="hero-rise inline-block text-primary-fixed font-headline font-bold tracking-widest uppercase text-xs mb-6"
          style={{ animationDelay: "150ms" }}
        >
          The Breath of the Savanna
        </span>
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-[1.04]">
          <span className="hero-rise inline-block" style={{ animationDelay: "300ms" }}>
            Explore East Africa,
          </span>
          <br />
          <span
            className="hero-rise hero-shimmer inline-block text-primary-fixed"
            style={{ animationDelay: "500ms" }}
          >
            Your Way
          </span>
        </h1>
        <p
          className="hero-rise text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ animationDelay: "700ms" }}
        >
          Tailored safaris, seamless transport and curated stays across Kenya,
          Tanzania and Uganda, handcrafted by local experts.
        </p>
        <div
          className="hero-rise flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: "900ms" }}
        >
          <Link href="/plan-trip" className="group">
            <Button size="lg" className="shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5">
              Plan My Trip <Compass className="h-5 w-5 transition-transform duration-700 group-hover:rotate-180" />
            </Button>
          </Link>
          <Link href="/transport">
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-transform hover:-translate-y-0.5"
            >
              Book Transport <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Current place + slide progress */}
      <div className="absolute bottom-8 left-0 right-0 z-10 px-6 md:px-10 flex items-end justify-between gap-6">
        <div key={active} className="hero-caption hidden sm:flex items-center gap-2 text-white/90" aria-live="polite">
          <MapPin className="h-4 w-4 text-primary-fixed" aria-hidden="true" />
          <span className="font-headline font-bold tracking-wide">{slide.place}</span>
          <span className="text-white/60 text-sm">· {slide.country}</span>
        </div>

        <div className="flex items-center gap-2 mx-auto sm:mx-0" role="tablist" aria-label="Choose a destination">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${s.place}, ${s.country}`}
              onClick={() => goTo(i)}
              className="group relative h-1.5 w-8 md:w-10 rounded-full bg-white/25 overflow-hidden"
            >
              <span
                key={i === active ? `on-${active}` : "off"}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-primary-fixed",
                  i === active ? "hero-progress" : i < active ? "w-full" : "w-0",
                  paused && "hero-paused"
                )}
                style={i === active ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
              />
            </button>
          ))}
        </div>
      </div>

      <a
        href="#explore"
        className="hero-bob absolute bottom-20 sm:bottom-9 left-1/2 -translate-x-1/2 z-10 text-white/70 hover:text-white"
        aria-label="Scroll to explore"
      >
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  );
}
