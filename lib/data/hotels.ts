import { IMG } from "@/lib/images";

export type Hotel = {
  id: string;
  name: string;
  country: string;
  region: string;
  destination: string;
  pricePerNight: number;
  rating: number;
  image: string;
  tags: string[];
  description: string;
  topRated?: boolean;
};

export const HOTELS: Hotel[] = [
  {
    id: "h1",
    name: "Mara River Lodge",
    country: "kenya",
    region: "Narok",
    destination: "maasai-mara",
    pricePerNight: 1250,
    rating: 4.9,
    image: IMG.maraRiverLodge,
    tags: ["Private Plunge Pool", "Game Drives", "Spa"],
    description: "Exclusive tented suites overlooking the Great Migration crossing point. All-inclusive fine dining and private guides.",
    topRated: true,
  },
  {
    id: "h2",
    name: "The Obsidian Suites",
    country: "tanzania",
    region: "Arusha",
    destination: "ngorongoro-crater",
    pricePerNight: 980,
    rating: 4.8,
    image: IMG.obsidianSuites,
    tags: ["Eco-Certified", "Wine Cellar"],
    description: "Sustainable architecture nestled among volcanic rocks with unparalleled views of the Ngorongoro crater.",
  },
  {
    id: "h3",
    name: "Serengeti Horizon Camp",
    country: "tanzania",
    region: "Mara",
    destination: "serengeti",
    pricePerNight: 820,
    rating: 4.7,
    image: IMG.safariJeep,
    tags: ["Tented", "Private Guide"],
    description: "Canvas suites on the edge of the migration corridor, under a canopy of stars.",
  },
  {
    id: "h4",
    name: "Diani Reef House",
    country: "kenya",
    region: "Coast",
    destination: "diani-beach",
    pricePerNight: 340,
    rating: 4.6,
    image: IMG.dianiBeach,
    tags: ["Beach", "Snorkel"],
    description: "Toes-in-the-sand suites on a quiet stretch of Diani's southern reef.",
  },
  {
    id: "h5",
    name: "Stone Town Heritage",
    country: "tanzania",
    region: "Zanzibar",
    destination: "zanzibar",
    pricePerNight: 295,
    rating: 4.5,
    image: IMG.stoneTown,
    tags: ["Historic", "Culture"],
    description: "A 19th-century merchant house reborn as a boutique boltholes in Stone Town.",
  },
  {
    id: "h6",
    name: "Volcanoes Sanctuary",
    country: "rwanda",
    region: "Musanze",
    destination: "volcanoes-np",
    pricePerNight: 1420,
    rating: 4.9,
    image: IMG.rwandaHills,
    tags: ["Gorilla Trek", "Spa"],
    description: "Volcano-facing stone cottages, warmed by log fires after a day tracking gorillas.",
    topRated: true,
  },
];
