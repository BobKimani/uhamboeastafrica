import { Hero } from "@/components/home/hero";
import { CountryBentoGrid } from "@/components/home/country-bento-grid";
import { ServicesSection } from "@/components/home/services-section";
import { FeaturedExperiences } from "@/components/home/featured-experiences";
import { TrendingScroller } from "@/components/home/trending-scroller";
import { Testimonials } from "@/components/home/testimonials";
import { FAQSection } from "@/components/home/faq-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CountryBentoGrid />
      <ServicesSection />
      <FeaturedExperiences />
      <TrendingScroller />
      <Testimonials />
      <FAQSection />
    </>
  );
}
