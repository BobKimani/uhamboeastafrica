"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

type VehicleDraft = {
  id?: string;
  name: string;
  type: string;
  capacity: number | "";
  pricePerDay: number | "";
  region: string;
  bestFor: string;
};

const EMPTY: VehicleDraft = {
  name: "",
  type: "",
  capacity: "",
  pricePerDay: "",
  region: "",
  bestFor: "",
};

export function TransportManager() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VehicleDraft>(EMPTY);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VEHICLES;
    return VEHICLES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.bestFor.toLowerCase().includes(q)
    );
  }, [query]);

  const openCreate = () => {
    setMode("create");
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setMode("edit");
    setDraft({
      id: v.id,
      name: v.name,
      type: v.type,
      capacity: v.capacity,
      pricePerDay: v.pricePerDay,
      region: v.region,
      bestFor: v.bestFor,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
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

          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add vehicle
          </Button>
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
                <Th className="text-right">Price / day</Th>
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
                  <Td className="text-right font-semibold">
                    {formatCurrency(v.pricePerDay, "USD")}
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
                        aria-label={`Delete ${v.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
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
            ? "Add a vehicle to the transport fleet."
            : "Update this vehicle's details."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              <Label htmlFor="vehicle-price">Price per day (USD)</Label>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/25 -mx-6 px-6 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
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
