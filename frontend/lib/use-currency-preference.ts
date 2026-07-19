"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_CURRENCY, type DisplayCurrency } from "@/lib/currency";

const STORAGE_KEY = "uhambo-currency";
const CHANGE_EVENT = "uhambo-currency-change";

function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return value === "KES" || value === "USD";
}

export function useCurrencyPreference() {
  const currency = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(CHANGE_EVENT, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(CHANGE_EVENT, onStoreChange);
      };
    },
    () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isDisplayCurrency(stored) ? stored : DEFAULT_CURRENCY;
    },
    () => DEFAULT_CURRENCY
  );

  const setCurrency = (next: DisplayCurrency) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { currency, setCurrency };
}
