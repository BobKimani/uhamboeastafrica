"use client";

import { useEffect, useState } from "react";
import { VEHICLES, type Vehicle } from "@/lib/data/vehicles";

const STORAGE_KEY = "uhambo-admin-vehicles";
const VEHICLES_CHANGED_EVENT = "uhambo-vehicles-changed";

function readVehicles() {
  if (typeof window === "undefined") return VEHICLES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return VEHICLES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return VEHICLES;

    return parsed.map((vehicle) => {
      const candidate = vehicle as Partial<Vehicle>;
      return {
        ...candidate,
        id: candidate.id ?? `v-${Date.now()}`,
        name: candidate.name ?? "Untitled vehicle",
        type: candidate.type ?? "Vehicle",
        capacity: candidate.capacity ?? 1,
        pricePerDay: candidate.pricePerDay ?? 0,
        bestFor: candidate.bestFor ?? "General transport",
        features: Array.isArray(candidate.features) ? candidate.features : [],
        image: candidate.image ?? VEHICLES[0].image,
        region: candidate.region ?? "All regions",
        isAvailable: candidate.isAvailable ?? true,
      } as Vehicle;
    });
  } catch {
    return VEHICLES;
  }
}

function writeVehicles(vehicles: Vehicle[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  window.dispatchEvent(new Event(VEHICLES_CHANGED_EVENT));
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);

  useEffect(() => {
    const syncVehicles = () => setVehicles(readVehicles());

    syncVehicles();
    window.addEventListener("storage", syncVehicles);
    window.addEventListener(VEHICLES_CHANGED_EVENT, syncVehicles);

    return () => {
      window.removeEventListener("storage", syncVehicles);
      window.removeEventListener(VEHICLES_CHANGED_EVENT, syncVehicles);
    };
  }, []);

  function saveVehicle(nextVehicle: Vehicle) {
    const nextVehicles = vehicles.some((vehicle) => vehicle.id === nextVehicle.id)
      ? vehicles.map((vehicle) =>
          vehicle.id === nextVehicle.id ? nextVehicle : vehicle
        )
      : [nextVehicle, ...vehicles];

    setVehicles(nextVehicles);
    writeVehicles(nextVehicles);
  }

  function deleteVehicle(id: string) {
    const nextVehicles = vehicles.filter((vehicle) => vehicle.id !== id);
    setVehicles(nextVehicles);
    writeVehicles(nextVehicles);
  }

  return { vehicles, saveVehicle, deleteVehicle };
}
