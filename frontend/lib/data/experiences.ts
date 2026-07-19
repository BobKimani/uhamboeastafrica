import { IMG } from "@/lib/images";

export type Experience = {
  id: string;
  title: string;
  category: "Safari" | "Beach" | "Culture" | "City";
  duration: string;
  location: string;
  description: string;
  image: string;
};

export const EXPERIENCES: Experience[] = [
  {
    id: "e1",
    title: "The Great Migration Safari",
    category: "Safari",
    duration: "7 Days",
    location: "Kenya & Tanzania",
    description: "Follow the herds across the Mara and Serengeti in search of river crossings.",
    image: IMG.safariJeep,
  },
  {
    id: "e2",
    title: "Diani Coastal Escape",
    category: "Beach",
    duration: "5 Days",
    location: "Kenya Coast",
    description: "Reef snorkelling, dhow sailing and long walks on powder sand.",
    image: IMG.dianiBeach,
  },
  {
    id: "e3",
    title: "Stone Town Heritage",
    category: "Culture",
    duration: "3 Days",
    location: "Zanzibar",
    description: "Carved wooden doors, spice markets and Swahili history.",
    image: IMG.stoneTown,
  },
  {
    id: "e4",
    title: "Gorilla Trek",
    category: "Safari",
    duration: "4 Days",
    location: "Rwanda",
    description: "An unforgettable morning with a family of mountain gorillas.",
    image: IMG.rwandaHills,
  },
  {
    id: "e5",
    title: "Nairobi City Tour",
    category: "City",
    duration: "1 Day",
    location: "Kenya",
    description: "Giraffe Centre, Karen Blixen and the buzzing heart of Nairobi.",
    image: IMG.cultureCity,
  },
  {
    id: "e6",
    title: "Lake Kivu Retreat",
    category: "Beach",
    duration: "4 Days",
    location: "Rwanda",
    description: "Kayak the calm waters and sleep to the sound of lapping waves.",
    image: IMG.lakeKivu,
  },
  {
    id: "e7",
    title: "Maasai Cultural Stay",
    category: "Culture",
    duration: "2 Days",
    location: "Kenya",
    description: "Share stories and learn the rhythms of Maasai village life.",
    image: IMG.cultureCity,
  },
  {
    id: "e8",
    title: "Kampala by Night",
    category: "City",
    duration: "1 Day",
    location: "Uganda",
    description: "Live music, street food and Ugandan coffee under neon lights.",
    image: IMG.murchisonFalls,
  },
];
