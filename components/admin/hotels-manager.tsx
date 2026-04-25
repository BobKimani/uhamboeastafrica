"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
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
import { HOTELS, type Hotel } from "@/lib/data/hotels";
import { formatCurrency } from "@/lib/utils";

type HotelDraft = {
  id?: string;
  name: string;
  country: string;
  region: string;
  pricePerNight: number | "";
};

const EMPTY: HotelDraft = {
  name: "",
  country: "",
  region: "",
  pricePerNight: "",
};

export function HotelsManager() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HotelDraft>(EMPTY);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HOTELS;
    return HOTELS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q)
    );
  }, [query]);

  const openCreate = () => {
    setMode("create");
    setDraft(EMPTY);
    setOpen(true);
  };

  const openEdit = (h: Hotel) => {
    setMode("edit");
    setDraft({
      id: h.id,
      name: h.name,
      country: h.country,
      region: h.region,
      pricePerNight: h.pricePerNight,
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
              placeholder="Search hotels…"
              aria-label="Search hotels"
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
            />
          </div>

          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add hotel
          </Button>
        </TableToolbar>

        {rows.length === 0 ? (
          <TableEmpty message="No hotels match your search." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Hotel</Th>
                <Th>Country</Th>
                <Th>Region</Th>
                <Th>Rating</Th>
                <Th className="text-right">Price / night</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-surface-container-low/60 transition-colors"
                >
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium">{h.name}</span>
                      {h.topRated && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">
                          Top rated
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="capitalize">{h.country}</Td>
                  <Td className="text-on-surface-variant">{h.region}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      <Star
                        className="h-3.5 w-3.5 fill-primary text-primary"
                        strokeWidth={0}
                      />
                      {h.rating.toFixed(1)}
                    </span>
                  </Td>
                  <Td className="text-right font-semibold">
                    {formatCurrency(h.pricePerNight, "USD")}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(h)}
                        aria-label={`Edit ${h.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${h.name}`}
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
        title={mode === "create" ? "Add hotel" : "Edit hotel"}
        description={
          mode === "create"
            ? "Create a new property listing for the booking engine."
            : "Update this property's details."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hotel-name">Hotel name</Label>
            <Input
              id="hotel-name"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Mara River Lodge"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hotel-country">Country</Label>
              <Input
                id="hotel-country"
                required
                value={draft.country}
                onChange={(e) =>
                  setDraft({ ...draft, country: e.target.value })
                }
                placeholder="Kenya"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hotel-region">Region</Label>
              <Input
                id="hotel-region"
                required
                value={draft.region}
                onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                placeholder="Narok"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hotel-price">Price per night (USD)</Label>
            <Input
              id="hotel-price"
              type="number"
              min={0}
              required
              value={draft.pricePerNight}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  pricePerNight:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              placeholder="1250"
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
              {mode === "create" ? "Create hotel" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
