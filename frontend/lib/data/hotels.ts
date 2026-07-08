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
  isAvailable: boolean;
};

export const HOTELS: Hotel[] = [
  {
    id: "mara-river-lodge",
    name: "Mara River Lodge",
    country: "kenya",
    region: "Narok",
    destination: "Maasai Mara",
    pricePerNight: 420,
    rating: 4.7,
    image: IMG.maraRiverLodge,
    tags: ["Safari", "Mara River", "Game drives"],
    description: "A real Maasai Mara lodge stay close to the river, suited for classic safari days, migration season and relaxed evenings in camp.",
    topRated: true,
    isAvailable: true,
  },
  {
    id: "the-sands-at-nomad",
    name: "The Sands at Nomad",
    country: "kenya",
    region: "Diani",
    destination: "Diani Beach",
    pricePerNight: 360,
    rating: 4.7,
    image: IMG.dianiBeach,
    tags: ["Beach", "Diving", "Boutique"],
    description: "A long-running Diani beachfront hotel with tropical gardens, white sand access and relaxed Swahili Coast character.",
    isAvailable: true,
  },
  {
    id: "four-seasons-serengeti",
    name: "Four Seasons Safari Lodge Serengeti",
    country: "tanzania",
    region: "Serengeti",
    destination: "Serengeti National Park",
    pricePerNight: 980,
    rating: 4.8,
    image: IMG.serengeti,
    tags: ["Safari", "Infinity pool", "Family friendly"],
    description: "A full-service safari lodge inside Serengeti National Park, built around wildlife viewing, spacious rooms and lodge comforts.",
    topRated: true,
    isAvailable: true,
  },
  {
    id: "ngorongoro-crater-lodge",
    name: "andBeyond Ngorongoro Crater Lodge",
    country: "tanzania",
    region: "Arusha",
    destination: "Ngorongoro Crater",
    pricePerNight: 1450,
    rating: 4.9,
    image: IMG.ngorongoro,
    tags: ["Crater views", "Safari", "Luxury lodge"],
    description: "A dramatic crater-rim lodge pairing ornate suites with immediate access to Ngorongoro's wildlife-rich caldera floor.",
    topRated: true,
    isAvailable: true,
  },
  {
    id: "sanctuary-gorilla-forest-camp",
    name: "Sanctuary Gorilla Forest Camp",
    country: "uganda",
    region: "Kanungu",
    destination: "Bwindi Impenetrable Forest",
    pricePerNight: 970,
    rating: 4.8,
    image: IMG.ugandaGorilla,
    tags: ["Gorilla trekking", "Forest camp", "Safari"],
    description: "An intimate forest camp in Bwindi, positioned for gorilla trekking with secluded tents and deep rainforest atmosphere.",
    topRated: true,
    isAvailable: true,
  },
  {
    id: "one-and-only-gorillas-nest",
    name: "One&Only Gorilla's Nest",
    country: "rwanda",
    region: "Musanze",
    destination: "Volcanoes National Park",
    pricePerNight: 1850,
    rating: 4.9,
    image: IMG.rwandaHills,
    tags: ["Gorilla trekking", "Wellness", "Volcano views"],
    description: "A high-end forest retreat near Volcanoes National Park, with treehouse-style suites and strong post-trek wellness comforts.",
    topRated: true,
    isAvailable: true,
  },
];
