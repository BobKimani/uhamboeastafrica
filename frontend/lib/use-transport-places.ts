"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTransportPlaces, type TransportPlace } from "@/lib/api/transport";

export function useTransportPlaces() {
  const [places, setPlaces] = useState<TransportPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTransportPlaces()
      .then((result) => {
        if (active) setPlaces(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Failed to load places");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  return { places, byId, loading, error };
}
