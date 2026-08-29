"use client";

import { useEffect, useState } from "react";
import type { Hotel } from "@/lib/data/hotels";
import {
  deleteHotel as deleteHotelRequest,
  fetchHotels,
  saveHotel as saveHotelRequest,
} from "@/lib/api/catalog";

export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setHotels(await fetchHotels());
      setHydrated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hotels.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function saveHotel(next: Hotel) {
    const saved = await saveHotelRequest(next);
    setHotels((rows) =>
      rows.some((hotel) => hotel.id === saved.id)
        ? rows.map((hotel) => (hotel.id === saved.id ? saved : hotel))
        : [saved, ...rows]
    );
    return saved;
  }

  async function deleteHotel(id: string) {
    await deleteHotelRequest(id);
    setHotels((rows) => rows.filter((h) => h.id !== id));
  }

  return { hotels, saveHotel, deleteHotel, hydrated, loading, error, reload };
}
