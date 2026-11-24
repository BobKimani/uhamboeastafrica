"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import {
  createTransportRoute,
  deleteTransportRoute,
  fetchTransportRoutes,
  updateTransportRoute,
  type TransportRoute,
} from "@/lib/api/transport";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

type EditDraft = { route: TransportRoute; distanceKm: string; reviewed: boolean };
type NewDraft = { fromPlace: string; toPlace: string; distanceKm: string };

export function TransportRoutesPanel() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [search, setSearch] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [creating, setCreating] = useState<NewDraft | null>(null);
  const [busy, setBusy] = useState(false);
  // Only the latest request may update the list (a slower earlier search
  // must not overwrite newer results).
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const [rows, review] = await Promise.all([
        fetchTransportRoutes({ search: search.trim(), needsReview: onlyReview }),
        fetchTransportRoutes({ needsReview: true }),
      ]);
      if (seq !== requestSeq.current) return;
      setRoutes(rows);
      setReviewCount(review.length);
    } catch (reason) {
      if (seq !== requestSeq.current) return;
      setError(reason instanceof Error ? reason.message : "Failed to load routes.");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [search, onlyReview]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => setLimit(PAGE_SIZE), [search, onlyReview]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!edit) return;
    const distanceKm = Number(edit.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError("Distance must be greater than 0 km.");
      return;
    }
    const ok = await run(() =>
      updateTransportRoute(edit.route.id, { distanceKm, needsReview: !edit.reviewed })
    );
    if (ok) setEdit(null);
  }

  async function saveNew(event: React.FormEvent) {
    event.preventDefault();
    if (!creating) return;
    const distanceKm = Number(creating.distanceKm);
    if (!creating.fromPlace.trim() || !creating.toPlace.trim() || !(distanceKm > 0)) {
      setError("Enter both places and a distance greater than 0 km.");
      return;
    }
    const ok = await run(() =>
      createTransportRoute({
        fromPlace: creating.fromPlace.trim(),
        toPlace: creating.toPlace.trim(),
        distanceKm,
      })
    );
    if (ok) setCreating(null);
  }

  function handleDelete(route: TransportRoute) {
    if (!window.confirm(`Delete the route ${route.fromPlace} ↔ ${route.toPlace}?`)) return;
    void run(() => deleteTransportRoute(route.id));
  }

  return (
    <>
      <TableCard>
        <TableToolbar>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-headline font-bold text-on-surface">Routes &amp; distances</h2>
            <p className="text-xs text-on-surface-variant">
              Routes marked &ldquo;Needs review&rdquo; cannot be booked online until confirmed.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
            <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant md:w-64">
              <Search className="h-4 w-4" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places…"
                aria-label="Search routes"
                className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
              />
            </div>
            <button
              type="button"
              aria-pressed={onlyReview}
              onClick={() => setOnlyReview((v) => !v)}
              className={cn(
                "h-10 rounded-xl px-3 text-xs font-bold transition-colors",
                onlyReview
                  ? "bg-amber-500/20 text-amber-700"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              )}
            >
              Needs review ({reviewCount})
            </button>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreating({ fromPlace: "", toPlace: "", distanceKm: "" })}
            >
              <Plus className="h-4 w-4" />
              Add route
            </Button>
          </div>
        </TableToolbar>

        {error && (
          <div className="px-5 py-3 text-sm text-red-500 border-b border-outline-variant/25">
            {error}
          </div>
        )}

        {loading && routes.length === 0 ? (
          <TableEmpty message="Loading routes..." />
        ) : routes.length === 0 ? (
          <TableEmpty message="No routes match your search." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th className="text-right">Distance (km)</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {routes.slice(0, limit).map((route) => (
                  <tr key={route.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <Td className="font-medium">{route.fromPlace}</Td>
                    <Td className="font-medium">{route.toPlace}</Td>
                    <Td className="text-right font-semibold">{route.distanceKm}</Td>
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          route.needsReview
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-green-500/15 text-green-600"
                        )}
                      >
                        {route.needsReview ? "Needs review" : "Bookable"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        {route.needsReview && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() => updateTransportRoute(route.id, { needsReview: false }))
                            }
                            aria-label={`Mark ${route.fromPlace} to ${route.toPlace} reviewed`}
                            title="Mark reviewed (distance is correct)"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-green-600 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEdit({
                              route,
                              distanceKm: String(route.distanceKm),
                              reviewed: !route.needsReview,
                            })
                          }
                          aria-label={`Edit ${route.fromPlace} to ${route.toPlace}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(route)}
                          aria-label={`Delete ${route.fromPlace} to ${route.toPlace}`}
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
            {routes.length > limit && (
              <div className="flex justify-center border-t border-outline-variant/25 p-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  Show more ({routes.length - limit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </TableCard>

      <Modal
        open={edit !== null}
        onClose={() => setEdit(null)}
        title="Edit route"
        description={edit ? `${edit.route.fromPlace} ↔ ${edit.route.toPlace}` : undefined}
      >
        {edit && (
          <form onSubmit={saveEdit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="route-distance">Distance one way (km)</Label>
              <Input
                id="route-distance"
                type="number"
                min={0.1}
                step={0.1}
                required
                value={edit.distanceKm}
                onChange={(e) => setEdit({ ...edit, distanceKm: e.target.value })}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={edit.reviewed}
                onChange={(e) => setEdit({ ...edit, reviewed: e.target.checked })}
                className="h-4 w-4 rounded border-outline-variant/40"
              />
              Distance confirmed — customers can book and pay for this route
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/25 -mx-6 px-6 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                Save route
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={creating !== null}
        onClose={() => setCreating(null)}
        title="Add route"
        description="New places are created automatically. The route is bookable straight away."
      >
        {creating && (
          <form onSubmit={saveNew} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="route-from">From</Label>
                <Input
                  id="route-from"
                  required
                  value={creating.fromPlace}
                  onChange={(e) => setCreating({ ...creating, fromPlace: e.target.value })}
                  placeholder="Nairobi"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="route-to">To</Label>
                <Input
                  id="route-to"
                  required
                  value={creating.toPlace}
                  onChange={(e) => setCreating({ ...creating, toPlace: e.target.value })}
                  placeholder="Maasai Mara"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="route-new-distance">Distance one way (km)</Label>
              <Input
                id="route-new-distance"
                type="number"
                min={0.1}
                step={0.1}
                required
                value={creating.distanceKm}
                onChange={(e) => setCreating({ ...creating, distanceKm: e.target.value })}
                placeholder="270"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/25 -mx-6 px-6 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                Add route
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
