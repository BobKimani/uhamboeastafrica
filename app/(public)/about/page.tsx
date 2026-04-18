import Image from "next/image";
import { Compass, Heart, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IMG } from "@/lib/images";

const VALUES = [
  {
    icon: Compass,
    title: "Rooted",
    description:
      "We grew up on these roads. Every recommendation is tested by someone who has actually been there.",
  },
  {
    icon: Heart,
    title: "Honest",
    description:
      "Transparent pricing, no hidden markups, no pressure. You should know what you're paying for and why.",
  },
  {
    icon: Sparkles,
    title: "Effortless",
    description:
      "We handle the permits, the logistics, the midnight changes. You show up and experience East Africa.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-24">
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <Image
          src={IMG.heroSavanna}
          alt="East Africa savanna"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 cinematic-overlay" />
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <span className="text-primary-fixed font-headline font-bold text-xs tracking-widest uppercase">
            About Uhambo
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-extrabold tracking-tight text-white mt-4 leading-[1.02]">
            The journey,
            <br /> on your terms
          </h1>
          <p className="text-white/80 text-lg md:text-xl mt-6 max-w-2xl mx-auto">
            Uhambo means "journey" in Swahili. We build those journeys for
            travelers who want East Africa on their own terms — guided by people
            who grew up on these roads.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-10 border border-outline-variant/15">
            <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
              Mission
            </span>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-3 leading-tight">
              Make East Africa effortless to explore.
            </h2>
            <p className="text-on-surface-variant mt-5 leading-relaxed">
              Without stripping away the texture that makes it worth exploring
              in the first place. The best trips are the ones where the details
              dissolve and the experience stays.
            </p>
          </Card>
          <Card className="p-10 border border-outline-variant/15 sunset-gradient text-white">
            <span className="text-white/70 font-headline font-bold text-xs tracking-widest uppercase">
              Vision
            </span>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight mt-3 leading-tight">
              A continent where both sides leave richer.
            </h2>
            <p className="text-white/85 mt-5 leading-relaxed">
              The traveler for the stories they carry home. The host for the
              relationships, livelihoods, and futures built along the way.
            </p>
          </Card>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
            <Image
              src={IMG.aboutStory}
              alt="Our story"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
              Our Story
            </span>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-background mt-3 leading-tight">
              Built by people who belong here
            </h2>
            <div className="space-y-5 mt-6 text-on-surface-variant leading-relaxed">
              <p>
                Uhambo began as a favor. A cousin messaging from Nairobi asking
                if we could help a friend figure out Mara timing, coastal
                transfers, a gorilla permit in Rwanda. We said yes, then the
                friend told a friend, and the favors became a waiting list.
              </p>
              <p>
                The pattern was always the same: travelers wanted East Africa,
                but not the template version. They wanted someone who knew
                which lodge the managers actually sleep at, which drivers won't
                flinch at a river crossing, which week of the season is worth
                flying halfway around the world for.
              </p>
              <p>
                So we built Uhambo — a small team with roots across Kenya,
                Tanzania, Uganda and Rwanda, and a stubborn belief that the
                best trips are the ones shaped by people who've already lived
                them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            What We Stand For
          </span>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-background mt-3">
            Three things, non-negotiable
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="p-10 border border-outline-variant/15 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-headline font-extrabold text-2xl mt-6 text-on-background">
                {title}
              </h3>
              <p className="text-on-surface-variant text-sm mt-3 leading-relaxed">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <Card className="p-12 md:p-16 border border-outline-variant/15 sunset-gradient text-white text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tight leading-[1.05]">
            Ready to explore
            <br /> East Africa?
          </h2>
          <p className="text-white/85 text-lg mt-5 max-w-xl mx-auto">
            Tell us where you're dreaming of, and we'll take it from there.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              Plan my trip
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Talk to us
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
