"use client";

import { useEffect, useState } from "react";
import { HOTELS, type Hotel } from "@/lib/data/hotels";

const STORAGE_KEY = "uhambo-admin-hotels";
const HOTELS_CHANGED_EVENT = "uhambo-hotels-changed";
const LEGACY_PLACEHOLDER_IDS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function readHotels(): Hotel[] {
  if (typeof window === "undefined") return HOTELS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return HOTELS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return HOTELS;
    if (
      parsed.some(
        (hotel) =>
          hotel &&
          typeof hotel === "object" &&
          LEGACY_PLACEHOLDER_IDS.has(String((hotel as Partial<Hotel>).id ?? ""))
      )
    ) {
      return HOTELS;
    }

    return parsed.map((hotel) => {
      const candidate = hotel as Partial<Hotel>;
      return {
        id: candidate.id ?? `h-${Date.now()}`,
        name: candidate.name ?? "Untitled hotel",
        country: candidate.country ?? "",
        region: candidate.region ?? "",
        destination: candidate.destination ?? "",
        pricePerNight: candidate.pricePerNight ?? 0,
        rating: candidate.rating ?? 0,
        image: candidate.image ?? HOTELS[0].image,
        tags: Array.isArray(candidate.tags) ? candidate.tags : [],
        description: candidate.description ?? "",
        topRated: candidate.topRated ?? false,
        isAvailable: candidate.isAvailable ?? true,
      } as Hotel;
    });
  } catch {
    return HOTELS;
  }
}

function writeHotels(hotels: Hotel[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hotels));
  window.dispatchEvent(new Event(HOTELS_CHANGED_EVENT));
}

export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>(HOTELS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHotels(readHotels());
      setHydrated(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(HOTELS_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(HOTELS_CHANGED_EVENT, sync);
    };
  }, []);

  function saveHotel(next: Hotel) {
    const nextHotels = hotels.some((h) => h.id === next.id)
      ? hotels.map((h) => (h.id === next.id ? next : h))
      : [next, ...hotels];
    setHotels(nextHotels);
    writeHotels(nextHotels);
  }

  function deleteHotel(id: string) {
    const nextHotels = hotels.filter((h) => h.id !== id);
    setHotels(nextHotels);
    writeHotels(nextHotels);
  }

  return { hotels, saveHotel, deleteHotel, hydrated };
}
