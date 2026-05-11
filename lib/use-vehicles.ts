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
    return Array.isArray(parsed) ? (parsed as Vehicle[]) : VEHICLES;
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

  return { vehicles, saveVehicle };
}
