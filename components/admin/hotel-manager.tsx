"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
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
import { cn, formatCurrency } from "@/lib/utils";
import { useHotels } from "@/lib/use-hotels";

type DisplayCurrency = "USD" | "KES";

type HotelDraft = {
  id: string;
  name: string;
  country: string;
  region: string;
  destination: string;
  pricePerNight: number | "";
  rating: number | "";
  tags: string;
  description: string;
  topRated: boolean;
  image: string;
};

const EMPTY: HotelDraft = {
  id: "",
  name: "",
  country: "",
  region: "",
  destination: "",
  pricePerNight: "",
  rating: "",
  tags: "",
  description: "",
  topRated: false,
  image: "",
};

const KES_PER_USD = 130;

function getDisplayPrice(priceUsd: number, currency: DisplayCurrency) {
  return currency === "KES" ? priceUsd * KES_PER_USD : priceUsd;
}

function getUsdPrice(price: number, currency: DisplayCurrency) {
  return currency === "KES" ? price / KES_PER_USD : price;
}

function generateId() {
  return `h${Date.now()}`;
}

export function HotelManager() {
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<DisplayCurrency>("KES");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HotelDraft>(EMPTY);
  const { hotels, saveHotel, deleteHotel } = useHotels();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.destination.toLowerCase().includes(q)
    );
  }, [query, hotels]);

  const isEditing = hotels.some((h) => h.id === draft.id);
  const hotelToDelete = hotels.find((h) => h.id === deleteId);

  const openAdd = () => {
    setDraft({ ...EMPTY, id: generateId() });
    setEditOpen(true);
  };

  const openEdit = (h: Hotel) => {
    setDraft({
      id: h.id,
      name: h.name,
      country: h.country,
      region: h.region,
      destination: h.destination,
      pricePerNight: getDisplayPrice(h.pricePerNight, currency),
      rating: h.rating,
      tags: h.tags.join(", "),
      description: h.description,
      topRated: h.topRated ?? false,
      image: h.image,
    });
    setEditOpen(true);
  };

  const handleCurrencyChange = (next: DisplayCurrency) => {
    if (next === currency) return;
    setDraft((d) => ({
      ...d,
      pricePerNight:
        d.pricePerNight === ""
          ? ""
          : getDisplayPrice(getUsdPrice(d.pricePerNight, currency), next),
    }));
    setCurrency(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.id || !draft.name || draft.pricePerNight === "" || draft.rating === "") return;

    const existing = hotels.find((h) => h.id === draft.id);
    saveHotel({
      id: draft.id,
      name: draft.name,
      country: draft.country.toLowerCase().trim(),
      region: draft.region.trim(),
      destination: draft.destination.trim(),
      pricePerNight: getUsdPrice(Number(draft.pricePerNight), currency),
      rating: Number(draft.rating),
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      description: draft.description.trim(),
      topRated: draft.topRated,
      image: existing?.image ?? HOTELS[0].image,
    });
    setEditOpen(false);
  };

  const confirmDelete = () => {
    if (deleteId) deleteHotel(deleteId);
    setDeleteId(null);
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

            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add hotel
            </Button>
          </div>
        </TableToolbar>

        {rows.length === 0 ? (
          <TableEmpty
            message={
              query
                ? "No hotels match your search."
                : "No hotels yet. Click 'Add hotel' to get started."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Hotel</Th>
                <Th>Location</Th>
                <Th>Rating</Th>
                <Th className="text-right">
                  Price / night ({currency === "KES" ? "KSh" : currency})
                </Th>
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
                      <span className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                        <span className="capitalize">{h.destination.replace(/-/g, " ")}</span>
                        {h.topRated && (
                          <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
                            <Star className="h-3 w-3 fill-current" aria-hidden />
                            Top rated
                          </span>
                        )}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="capitalize font-medium">{h.country}</span>
                      <span className="text-xs text-on-surface-variant mt-0.5">{h.region}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="font-semibold">{h.rating.toFixed(1)}</span>
                    </span>
                  </Td>
                  <Td className="text-right font-semibold">
                    {formatCurrency(getDisplayPrice(h.pricePerNight, currency), currency)}
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
                        onClick={() => setDeleteId(h.id)}
                        aria-label={`Delete ${h.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
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

      {/* Add / Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={isEditing ? "Edit hotel" : "Add hotel"}
        description={
          isEditing
            ? "Update this hotel's details."
            : "Add a new hotel to the catalogue."
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="hotel-name">Hotel name</Label>
              <Input
                id="hotel-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Mara River Lodge"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hotel-country">Country</Label>
              <Input
                id="hotel-country"
                required
                value={draft.country}
                onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                placeholder="kenya"
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
            <Label htmlFor="hotel-destination">Destination</Label>
            <Input
              id="hotel-destination"
              required
              value={draft.destination}
              onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
              placeholder="maasai-mara"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hotel-price">
                  Price / night
                </Label>
                <div
                  className="inline-flex h-7 rounded-lg bg-surface-container-low p-0.5"
                  aria-label="Price currency"
                >
                  {(["KES", "USD"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleCurrencyChange(option)}
                      aria-pressed={currency === option}
                      className={cn(
                        "min-w-10 rounded-md px-2 text-[11px] font-bold transition-colors",
                        currency === option
                          ? "bg-surface text-on-surface shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {option === "KES" ? "KSh" : option}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="hotel-price"
                type="number"
                min={0}
                step={1}
                required
                value={draft.pricePerNight}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    pricePerNight: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="1250"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hotel-rating">Rating (0 – 5)</Label>
              <Input
                id="hotel-rating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                required
                value={draft.rating}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rating: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="4.9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hotel-tags">
              Amenity tags{" "}
              <span className="text-on-surface-variant font-normal">(comma-separated)</span>
            </Label>
            <Input
              id="hotel-tags"
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              placeholder="Private Plunge Pool, Game Drives, Spa"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hotel-description">Description</Label>
            <textarea
              id="hotel-description"
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Short description of the hotel experience…"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none transition"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="hotel-toprated"
              checked={draft.topRated}
              onChange={(e) => setDraft({ ...draft, topRated: e.target.checked })}
              className="h-4 w-4 rounded border-outline-variant/40 accent-primary"
            />
            <span className="text-sm font-medium text-on-surface flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              Mark as top rated
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/25 -mx-6 px-6 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {isEditing ? "Save changes" : "Add hotel"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Remove hotel"
        description={`"${hotelToDelete?.name ?? ""}" will be permanently removed from the catalogue. This cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteId(null)}
          >
            Keep it
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700 shadow-none hover:shadow-none dark:bg-red-700 dark:hover:bg-red-600"
            onClick={confirmDelete}
          >
            Yes, remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
