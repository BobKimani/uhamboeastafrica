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
