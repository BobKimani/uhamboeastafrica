"use client";

import { useEffect, useState } from "react";
import { HOTELS, type Hotel } from "@/lib/data/hotels";

const STORAGE_KEY = "uhambo-admin-hotels";
const HOTELS_CHANGED_EVENT = "uhambo-hotels-changed";

function readHotels(): Hotel[] {
  if (typeof window === "undefined") return HOTELS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return HOTELS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Hotel[]) : HOTELS;
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

  useEffect(() => {
    const sync = () => setHotels(readHotels());
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

  return { hotels, saveHotel, deleteHotel };
}
