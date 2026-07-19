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

export const DESTINATIONS: Destination[] = [];
