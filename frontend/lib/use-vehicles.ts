"use client";

import { useEffect, useState } from "react";
import type { Vehicle } from "@/lib/data/vehicles";
import {
  deleteVehicle as deleteVehicleRequest,
  fetchVehicles,
  saveVehicle as saveVehicleRequest,
} from "@/lib/api/catalog";

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setVehicles(await fetchVehicles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function saveVehicle(nextVehicle: Vehicle) {
    const saved = await saveVehicleRequest(nextVehicle);
    setVehicles((rows) =>
      rows.some((vehicle) => vehicle.id === saved.id)
        ? rows.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle))
        : [saved, ...rows]
    );
    return saved;
  }

  async function deleteVehicle(id: string) {
    await deleteVehicleRequest(id);
    setVehicles((rows) => rows.filter((vehicle) => vehicle.id !== id));
  }

  return { vehicles, saveVehicle, deleteVehicle, loading, error, reload };
}
