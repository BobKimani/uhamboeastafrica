import { IMG } from "@/lib/images";

export type Destination = {
  slug: string;
  name: string;
  country: string;
  region: string;
  description: string;
  image: string;
  pricePerNight: number;
  tags: string[];
};

export const DESTINATIONS: Destination[] = [
  {
    slug: "maasai-mara",
    name: "Maasai Mara",
    country: "kenya",
    region: "Narok",
    description: "Witness the Great Migration and big cats in Kenya's most iconic reserve.",
    image: IMG.masaiMara,
    pricePerNight: 420,
    tags: ["Safari", "Wildlife"],
  },
  {
    slug: "diani-beach",
    name: "Diani Beach",
    country: "kenya",
    region: "Coast",
    description: "Powder-white sand and turquoise reef on Kenya's southern coast.",
    image: IMG.dianiBeach,
    pricePerNight: 260,
    tags: ["Beach", "Relax"],
  },
  {
    slug: "serengeti",
    name: "Serengeti",
    country: "tanzania",
    region: "Mara",
    description: "Endless plains where wildebeest thunder across the horizon.",
    image: IMG.safariJeep,
    pricePerNight: 560,
    tags: ["Safari", "Migration"],
  },
  {
    slug: "ngorongoro-crater",
    name: "Ngorongoro Crater",
    country: "tanzania",
    region: "Arusha",
    description: "An intact volcanic caldera teeming with wildlife at every turn.",
    image: IMG.ngorongoro,
    pricePerNight: 480,
    tags: ["Safari", "Geology"],
  },
  {
    slug: "zanzibar",
    name: "Zanzibar",
    country: "tanzania",
    region: "Stone Town",
    description: "Spice-scented alleys and dhow-speckled turquoise seas.",
    image: IMG.stoneTown,
    pricePerNight: 310,
    tags: ["Culture", "Beach"],
  },
  {
    slug: "bwindi",
    name: "Bwindi Forest",
    country: "uganda",
    region: "Kanungu",
    description: "Track mountain gorillas through ancient misty rainforest.",
    image: IMG.ugandaGorilla,
    pricePerNight: 640,
    tags: ["Wildlife", "Trek"],
  },
  {
    slug: "murchison-falls",
    name: "Murchison Falls",
    country: "uganda",
    region: "Nile",
    description: "The Nile thunders through a narrow gorge into a lush valley.",
    image: IMG.murchisonFalls,
    pricePerNight: 280,
    tags: ["Nature", "Adventure"],
  },
  {
    slug: "volcanoes-np",
    name: "Volcanoes National Park",
    country: "rwanda",
    region: "Musanze",
    description: "Mist-cloaked summits hiding the world's last mountain gorillas.",
    image: IMG.rwandaHills,
    pricePerNight: 720,
    tags: ["Wildlife", "Trek"],
  },
  {
    slug: "lake-kivu",
    name: "Lake Kivu",
    country: "rwanda",
    region: "Western",
    description: "Calm inland waters framed by rolling green hills and coffee farms.",
    image: IMG.lakeKivu,
    pricePerNight: 220,
    tags: ["Lake", "Relax"],
  },
];
