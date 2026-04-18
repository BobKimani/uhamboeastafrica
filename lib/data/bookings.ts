export type BookingStatus = "Confirmed" | "Pending" | "Processing" | "Cancelled";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  destination: string;
  startDate: string;
  endDate: string;
  pax: number;
  status: BookingStatus;
};

export const BOOKINGS: Booking[] = [
  { id: "UH-9821", name: "Julianne Davenport", phone: "+1 415 555 0123", email: "julianne@example.com", type: "Safari Trip", destination: "Maasai Mara, Kenya", startDate: "2026-05-12", endDate: "2026-05-18", pax: 4, status: "Confirmed" },
  { id: "UH-9822", name: "Marcus Kjellberg", phone: "+46 70 555 0144", email: "marcus@example.com", type: "Transport", destination: "Serengeti Airstrip", startDate: "2026-05-14", endDate: "2026-05-14", pax: 2, status: "Pending" },
  { id: "UH-9823", name: "Elena Soros", phone: "+44 20 7555 0199", email: "elena@example.com", type: "Safari Trip", destination: "Ngorongoro Crater", startDate: "2026-05-15", endDate: "2026-05-22", pax: 5, status: "Confirmed" },
  { id: "UH-9824", name: "Amina Lowo", phone: "+234 803 555 0188", email: "amina@example.com", type: "Luxury Stay", destination: "Zanzibar", startDate: "2026-06-02", endDate: "2026-06-09", pax: 2, status: "Processing" },
  { id: "UH-9825", name: "Takeshi Yamamoto", phone: "+81 90 5555 0177", email: "takeshi@example.com", type: "Safari Trip", destination: "Bwindi, Uganda", startDate: "2026-06-11", endDate: "2026-06-16", pax: 3, status: "Confirmed" },
  { id: "UH-9826", name: "Sofia Martins", phone: "+351 91 555 0166", email: "sofia@example.com", type: "Transport", destination: "Kilimanjaro Transfer", startDate: "2026-06-18", endDate: "2026-06-18", pax: 6, status: "Pending" },
];
