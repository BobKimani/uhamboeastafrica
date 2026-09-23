"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { INITIAL_STATE, WizardState } from "./types";
import { COUNTRIES } from "@/lib/data/countries";

const STORAGE_KEY = "uhambo:wizard";

type WizardContextValue = {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  reset: () => void;
  hydrated: boolean;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: WizardState = { ...INITIAL_STATE, ...JSON.parse(raw) };
          // Drop a saved destination we no longer offer (e.g. Rwanda).
          if (
            saved.destination &&
            !COUNTRIES.some((c) => c.slug === saved.destination)
          ) {
            saved.destination = undefined;
            saved.accommodation = {};
          }
          setState(saved);
        }
      } catch {}
      setHydrated(true);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ state, update, reset, hydrated }),
    [state, update, reset, hydrated]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
