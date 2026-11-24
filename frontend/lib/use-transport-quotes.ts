"use client";

import { useEffect, useState } from "react";
import { fetchTransportQuote, type QuoteResult, type TripType } from "@/lib/api/transport";

type QuoteState = { key: string; quotes: Record<string, QuoteResult> };

/**
 * Backend quotes for each vehicle on a listed route, keyed by vehicle id.
 * Empty until a complete route is chosen; results for an older request are
 * never shown for a newer one.
 */
export function useTransportQuotes(
  fromId: string | undefined,
  toId: string | undefined,
  tripType: TripType,
  vehicleIds: string[]
) {
  const ids = vehicleIds.join(",");
  const requestKey = fromId && toId && ids ? [fromId, toId, tripType, ids].join("|") : "";
  const [state, setState] = useState<QuoteState>({ key: "", quotes: {} });

  useEffect(() => {
    if (!requestKey) return;
    const [from, to, trip, vehicleList] = requestKey.split("|");
    let active = true;
    Promise.all(
      vehicleList.split(",").map(async (vehicleId) => {
        const result = await fetchTransportQuote({
          fromId: from,
          toId: to,
          vehicleId,
          tripType: trip as TripType,
        }).catch(
          (): QuoteResult => ({
            ok: false,
            code: "pricing_unavailable",
            error: "Could not price this trip",
          })
        );
        return [vehicleId, result] as const;
      })
    ).then((entries) => {
      if (active) setState({ key: requestKey, quotes: Object.fromEntries(entries) });
    });
    return () => {
      active = false;
    };
  }, [requestKey]);

  const ready = requestKey !== "" && state.key === requestKey;
  return { quotes: ready ? state.quotes : {}, loading: requestKey !== "" && !ready };
}
