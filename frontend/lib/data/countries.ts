import { IMG } from "@/lib/images";

export type Country = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
};

export const COUNTRIES: Country[] = [
  { slug: "kenya", name: "Kenya", tagline: "Heart of the Great Migration", image: IMG.kenyaFlag },
  { slug: "tanzania", name: "Tanzania", tagline: "The Roof of Africa", image: IMG.tanzaniaFlag },
  { slug: "uganda", name: "Uganda", tagline: "Pearl of the Continent", image: IMG.ugandaFlag },
  { slug: "rwanda", name: "Rwanda", tagline: "Land of a Thousand Hills", image: IMG.rwandaFlag },
];
