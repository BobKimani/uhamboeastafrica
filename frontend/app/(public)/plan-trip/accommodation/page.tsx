"use client";

import { Minus, Plus } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { HotelPicker } from "@/components/wizard/hotel-picker";
import { NeedToggle } from "@/components/wizard/need-toggle";
import { Label } from "@/components/ui/input";
import { useWizard } from "@/lib/wizard/store";
import { useHotels } from "@/lib/use-hotels";
import {
  RoomType,
  serviceTypeFor,
  skipsAccommodation,
  totalRooms,
} from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

const ROOMS: { type: RoomType; description: string }[] = [
  { type: "Single", description: "1 guest • one bed" },
  { type: "Twin", description: "2 guests • two beds" },
  { type: "Double", description: "2 guests • one bed" },
  { type: "Triple", description: "3 guests • extra bed" },
];

const MAX_ROOMS_PER_TYPE = 10;

export default function AccommodationStep() {
  const { state, update } = useWizard();
  const { hotels, loading } = useHotels();
  const skipped = skipsAccommodation(state);

  const countryHasHotels = hotels.some(
    (hotel) =>
      hotel.isAvailable &&
      hotel.country.toLowerCase() === (state.destination ?? "").toLowerCase()
  );
  const hotelChosen = !!state.accommodation?.hotelId;
  const showRooms = !loading && (hotelChosen || !countryHasHotels);
  const canContinue =
    skipped ||
    ((hotelChosen || !countryHasHotels) &&
      totalRooms(state.accommodation?.rooms) > 0);

  const setNeeded = (needed: boolean) =>
    update({
      skipAccommodation: !needed,
      // Someone skipping accommodation must at least want transport.
      ...(needed ? {} : { skipTransport: false }),
      serviceType: serviceTypeFor(!needed, needed ? !!state.skipTransport : false),
    });

  const setRoomCount = (type: RoomType, count: number) =>
    update({
      accommodation: {
        ...state.accommodation,
        rooms: {
          ...state.accommodation?.rooms,
          [type]: Math.min(MAX_ROOMS_PER_TYPE, Math.max(0, count)),
        },
      },
    });

  return (
    <WizardShell
      stepSlug="accommodation"
      title="Where would you like to stay?"
      subtitle="Start with the level of comfort you're after, then pick a property and your rooms."
      canContinue={canContinue}
    >
      <div className="space-y-8">
        <NeedToggle
          needed={!skipped}
          onChange={setNeeded}
          needLabel="I need accommodation"
          skipLabel="Skip, I've arranged my stay"
        />

        {skipped ? (
          <p className="text-center text-sm text-on-surface-variant">
            No problem — continue to arrange your transport.
          </p>
        ) : (
          <section className="bg-surface-container-low rounded-2xl p-8 max-w-3xl mx-auto w-full space-y-8">
            <HotelPicker
              hotels={hotels}
              loading={loading}
              country={state.destination}
              selectedId={state.accommodation?.hotelId}
              stars={state.accommodation?.stars}
              onStarsChange={(stars) =>
                update({
                  accommodation: {
                    ...state.accommodation,
                    stars,
                    // A hotel from another rating no longer matches.
                    ...(stars !== state.accommodation?.stars
                      ? { hotelId: undefined, hotelName: undefined, region: undefined }
                      : {}),
                  },
                })
              }
              onSelect={(hotel) =>
                update({
                  accommodation: {
                    ...state.accommodation,
                    hotelId: hotel.id,
                    hotelName: hotel.name,
                    region: hotel.region,
                  },
                })
              }
            />

            {showRooms && (
              <div>
                <Label className="block mb-3">
                  {countryHasHotels ? "3. Choose your rooms" : "Rooms"}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROOMS.map(({ type, description }) => {
                    const count = state.accommodation?.rooms?.[type] ?? 0;
                    return (
                      <div
                        key={type}
                        className={cn(
                          "flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-highest transition-all",
                          count > 0 && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div>
                          <div className="font-headline font-bold text-sm text-on-surface">
                            {type}
                          </div>
                          <div className="text-xs text-secondary mt-0.5">
                            {description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRoomCount(type, count - 1)}
                            disabled={count <= 0}
                            aria-label={`Fewer ${type} rooms`}
                            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center font-headline font-extrabold text-lg text-on-surface tabular-nums">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRoomCount(type, count + 1)}
                            disabled={count >= MAX_ROOMS_PER_TYPE}
                            aria-label={`More ${type} rooms`}
                            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-on-surface-variant mt-3">
                  Mix and match room types — add at least one room to continue.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </WizardShell>
  );
}
