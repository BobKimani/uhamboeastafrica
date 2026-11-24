export type Vehicle = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerDay: number;
  /** Fuel consumption used for route pricing; null = cannot be quoted online. */
  kmPerLitre: number | null;
  bestFor: string;
  features: string[];
  image: string;
  region: string;
  isAvailable: boolean;
};
