import { IMG } from "@/lib/images";

export type Vehicle = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerDay: number;
  bestFor: string;
  features: string[];
  image: string;
  region: string;
};

export const VEHICLES: Vehicle[] = [
  {
    id: "v1",
    name: "Toyota Land Cruiser",
    type: "4x4 Land Cruiser",
    capacity: 6,
    pricePerDay: 250,
    bestFor: "Safari & rough terrain",
    features: ["6 Seats", "In-car Wi-Fi", "Full A/C", "Cooler Box"],
    image: IMG.landCruiser,
    region: "All regions",
  },
  {
    id: "v2",
    name: "Luxury Alphard",
    type: "Alphard",
    capacity: 4,
    pricePerDay: 180,
    bestFor: "Airport transfers & city",
    features: ["4 VIP Seats", "Mini Bar", "Leg Rest", "Premium Audio"],
    image: IMG.alphard,
    region: "City / Airports",
  },
  {
    id: "v3",
    name: "10-seater Van",
    type: "10-seater Van",
    capacity: 10,
    pricePerDay: 210,
    bestFor: "Small groups",
    features: ["10 Seats", "A/C", "Luggage space"],
    image: IMG.tenSeaterVan,
    region: "All regions",
  },
  {
    id: "v5",
    name: "Coaster Bus",
    type: "Coaster",
    capacity: 28,
    pricePerDay: 360,
    bestFor: "Large groups & tours",
    features: ["28 Seats", "A/C", "PA system"],
    image: IMG.coaster,
    region: "All regions",
  },
  {
    id: "v6",
    name: "Noah MPV",
    type: "Noah",
    capacity: 7,
    pricePerDay: 140,
    bestFor: "Family transfers",
    features: ["7 Seats", "A/C", "Economical"],
    image: IMG.noah,
    region: "City",
  },
  {
    id: "v7",
    name: "Expedition Truck",
    type: "Truck",
    capacity: 22,
    pricePerDay: 420,
    bestFor: "Overland expeditions",
    features: ["22 Seats", "Overland kit", "High clearance"],
    image: IMG.expeditionTruck,
    region: "Cross-border",
  },
];
