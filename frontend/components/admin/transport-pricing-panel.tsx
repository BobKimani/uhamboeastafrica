"use client";

import { useEffect, useState } from "react";
import { Fuel, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { TableCard } from "@/components/admin/data-table";
import {
  fetchPricingSettings,
  savePricingSettings,
  type TransportPricingSettings,
} from "@/lib/api/transport";

type Draft = { fuelPriceKes: string; marginKes: string; multiplier: string };

function toDraft(settings: TransportPricingSettings): Draft {
  return {
    fuelPriceKes: String(settings.fuelPriceKes),
    marginKes: String(settings.marginKes),
    multiplier: String(settings.multiplier),
  };
}

function formatUpdated(value: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export function TransportPricingPanel() {
  const [settings, setSettings] = useState<TransportPricingSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({ fuelPriceKes: "", marginKes: "", multiplier: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPricingSettings()
      .then((result) => {
        setSettings(result);
        setDraft(toDraft(result));
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Failed to load pricing settings.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const values = {
      fuelPriceKes: Number(draft.fuelPriceKes),
      marginKes: Number(draft.marginKes),
      multiplier: Number(draft.multiplier),
    };
    if (![values.fuelPriceKes, values.marginKes, values.multiplier].every(Number.isFinite)) {
      setError("Enter valid numbers.");
      return;
    }
    setSaving(true);
    try {
      const next = await savePricingSettings(values);
      setSettings(next);
      setDraft(toDraft(next));
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to save pricing settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableCard>
      <form onSubmit={handleSubmit} className="p-4 md:p-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-headline font-bold text-on-surface">Transport pricing</h2>
          </div>
          <p className="text-xs text-on-surface-variant">
            Last updated: {loading ? "…" : formatUpdated(settings?.updatedAt ?? null)}
          </p>
        </div>
        <p className="text-sm text-on-surface-variant mt-2">
          Trip price = (fuel + driver&apos;s allowance + margin) × multiplier. Fuel = distance ÷
          vehicle km/L × fuel price × 2 (one way and return cost the same — the vehicle always comes back). Driver&apos;s allowance =
          fuel ÷ 2. Changes apply to new quotes immediately; existing bookings keep their price.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pricing-fuel">Fuel price per litre (KSh)</Label>
            <Input
              id="pricing-fuel"
              type="number"
              min={0.01}
              step="any"
              required
              disabled={loading}
              value={draft.fuelPriceKes}
              onChange={(e) => setDraft({ ...draft, fuelPriceKes: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pricing-margin">Uhambo margin (KSh)</Label>
            <Input
              id="pricing-margin"
              type="number"
              min={0}
              step="any"
              required
              disabled={loading}
              value={draft.marginKes}
              onChange={(e) => setDraft({ ...draft, marginKes: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pricing-multiplier">Multiplier</Label>
            <Input
              id="pricing-multiplier"
              type="number"
              min={0.0001}
              max={5}
              step="any"
              required
              disabled={loading}
              value={draft.multiplier}
              onChange={(e) => setDraft({ ...draft, multiplier: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
          {saved && !error && <p className="text-sm text-green-600 mr-auto">Pricing saved.</p>}
          <Button type="submit" size="sm" disabled={loading || saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save pricing"}
          </Button>
        </div>
      </form>
    </TableCard>
  );
}
