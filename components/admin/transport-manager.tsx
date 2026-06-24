"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/admin/modal";
import {
  TableCard,
  TableToolbar,
  Table,
  Th,
  Td,
  TableEmpty,
} from "@/components/admin/data-table";
import { VEHICLES, type Vehicle } from "@/lib/data/vehicles";
import { cn, formatCurrency } from "@/lib/utils";
import { useVehicles } from "@/lib/use-vehicles";

type DisplayCurrency = "USD" | "KES";

type VehicleDraft = {
  id: string;
  name: string;
  type: string;
  capacity: number | "";
  pricePerDay: number | "";
  region: string;
  bestFor: string;
  image: string;
  isAvailable: boolean;
};

const EMPTY: VehicleDraft = {
  id: "",
  name: "",
  type: "",
  capacity: "",
  pricePerDay: "",
  region: "",
  bestFor: "",
  image: "",
  isAvailable: true,
};

const KES_PER_USD = 130;

function getDisplayPrice(priceUsd: number, currency: DisplayCurrency) {
  return currency === "KES" ? priceUsd * KES_PER_USD : priceUsd;
}

function getUsdPrice(price: number, currency: DisplayCurrency) {
  return currency === "KES" ? price / KES_PER_USD : price;
}

export function TransportManager() {
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<DisplayCurrency>("KES");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY);
  const { vehicles, saveVehicle, deleteVehicle } = useVehicles();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.bestFor.toLowerCase().includes(q)
    );
  }, [query, vehicles]);

  const openEdit = (v: Vehicle) => {
    setMode("edit");
    setDraft({
      id: v.id,
      name: v.name,
      type: v.type,
      capacity: v.capacity,
      pricePerDay: getDisplayPrice(v.pricePerDay, currency),
      region: v.region,
      bestFor: v.bestFor,
      image: v.image,
      isAvailable: v.isAvailable,
    });
    setOpen(true);
  };

  const openCreate = () => {
    setMode("create");
    setDraft(EMPTY);
    setOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    const confirmed = window.confirm(
      `Delete ${vehicle.name}? This action cannot be undone.`
    );
    if (!confirmed) return;
    deleteVehicle(vehicle.id);
  };

  const handleCurrencyChange = (nextCurrency: DisplayCurrency) => {
    if (nextCurrency === currency) return;

    setDraft((current) => ({
      ...current,
      pricePerDay:
        current.pricePerDay === ""
          ? ""
          : getDisplayPrice(getUsdPrice(current.pricePerDay, currency), nextCurrency),
    }));
    setCurrency(nextCurrency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name || !draft.type || draft.capacity === "" || draft.pricePerDay === "") {
      return;
    }

    const vehicleId = draft.id.trim() || `v-${Date.now()}`;

    const existingVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
    const fallbackVehicle = VEHICLES[0];

    saveVehicle({
      id: vehicleId,
      name: draft.name,
      type: draft.type,
      capacity: draft.capacity,
      pricePerDay: getUsdPrice(draft.pricePerDay, currency),
      region: draft.region,
      bestFor: draft.bestFor,
      features: existingVehicle?.features ?? fallbackVehicle.features,
      image: draft.image.trim() || existingVehicle?.image || fallbackVehicle.image,
      isAvailable: draft.isAvailable,
    });

    setOpen(false);
    setDraft(EMPTY);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(file);
    });

    setDraft((current) => ({ ...current, image: dataUrl }));
  };

  return (
    <>
      <TableCard>
        <TableToolbar>
          <div className="flex items-center h-10 w-full md:w-80 gap-2 px-3 rounded-xl bg-surface-container-low text-on-surface-variant">
            <Search className="h-4 w-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicles…"
              aria-label="Search vehicles"
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex h-10 rounded-xl bg-surface-container-low p-1"
              aria-label="Display currency"
            >
              {(["KES", "USD"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleCurrencyChange(option)}
                  aria-pressed={currency === option}
                  className={cn(
                    "min-w-14 rounded-lg px-3 text-xs font-bold transition-colors",
                    currency === option
                      ? "bg-surface text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {option === "KES" ? "KSh" : option}
                </button>
              ))}
            </div>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add vehicle
            </Button>
          </div>
        </TableToolbar>

        {rows.length === 0 ? (
          <TableEmpty message="No vehicles match your search." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Vehicle</Th>
                <Th>Capacity</Th>
                <Th>Region</Th>
                <Th>Best for</Th>
                <Th>Availability</Th>
                <Th className="text-right">
                  Price / day ({currency === "KES" ? "KSh" : currency})
                </Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-surface-container-low/60 transition-colors"
                >
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium">{v.name}</span>
                      <span className="text-xs text-on-surface-variant mt-0.5">
                        {v.type}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
                      <Users className="h-3.5 w-3.5" />
                      {v.capacity}
                    </span>
                  </Td>
                  <Td className="text-on-surface-variant">{v.region}</Td>
                  <Td className="text-on-surface-variant">{v.bestFor}</Td>
                  <Td>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        v.isAvailable
                          ? "bg-green-500/15 text-green-600"
                          : "bg-outline-variant/25 text-on-surface-variant"
                      )}
                    >
                      {v.isAvailable ? "Available" : "Hidden"}
                    </span>
                  </Td>
                  <Td className="text-right font-semibold">
                    {formatCurrency(
                      getDisplayPrice(v.pricePerDay, currency),
                      currency
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        aria-label={`Edit ${v.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        aria-label={`Delete ${v.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === "create" ? "Add vehicle" : "Edit vehicle"}
        description={
          mode === "create"
            ? "Create a new vehicle in your fleet."
            : "Update this vehicle's details."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {mode === "edit" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle-id">Vehicle ID</Label>
              <Input
                id="vehicle-id"
                value={draft.id}
                disabled
                className="opacity-70"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle-name">Display name</Label>
              <Input
                id="vehicle-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Toyota Land Cruiser"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle-type">Type</Label>
              <Input
                id="vehicle-type"
                required
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                placeholder="4x4 Land Cruiser"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle-capacity">Capacity</Label>
              <Input
                id="vehicle-capacity"
                type="number"
                min={1}
                required
                value={draft.capacity}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    capacity:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="6"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle-price">
                Price per day ({currency === "KES" ? "KSh" : currency})
              </Label>
              <Input
                id="vehicle-price"
                type="number"
                min={0}
                required
                value={draft.pricePerDay}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    pricePerDay:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="250"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicle-region">Region</Label>
            <Input
              id="vehicle-region"
              required
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder="All regions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicle-bestfor">Best for</Label>
            <Input
              id="vehicle-bestfor"
              required
              value={draft.bestFor}
              onChange={(e) => setDraft({ ...draft, bestFor: e.target.value })}
              placeholder="Safari & rough terrain"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicle-image-upload">Upload vehicle image</Label>
            <Input
              id="vehicle-image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                void handleImageUpload(e.target.files?.[0] ?? null);
              }}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={draft.isAvailable}
              onChange={(e) =>
                setDraft({ ...draft, isAvailable: e.target.checked })
              }
              className="h-4 w-4 rounded border-outline-variant/40"
            />
            Show this vehicle on the public transport page
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/25 -mx-6 px-6 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setDraft(EMPTY);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {mode === "create" ? "Add vehicle" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
