import { apiUrl, readJson } from "@/lib/api/client";
import type { Hotel } from "@/lib/data/hotels";
import type { Vehicle } from "@/lib/data/vehicles";
import { mediaUrl } from "@/lib/media";

export async function fetchHotels(): Promise<Hotel[]> {
  const response = await fetch(apiUrl("/api/hotels"), { method: "GET" });
  const result = await readJson<{ hotels: Hotel[] }>(
    response,
    "Failed to fetch hotels"
  );
  return result.hotels;
}

export async function saveHotel(hotel: Hotel): Promise<Hotel> {
  const isExisting = Boolean(hotel.id);
  const response = await fetch(
    apiUrl(isExisting ? `/api/hotels/${hotel.id}` : "/api/hotels"),
    {
      method: isExisting ? "PATCH" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(hotel),
    }
  );
  const result = await readJson<{ hotel: Hotel }>(
    response,
    "Failed to save hotel"
  );
  return result.hotel;
}

export async function deleteHotel(id: string) {
  const response = await fetch(apiUrl(`/api/hotels/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  return readJson<{ success: true; message: string }>(
    response,
    "Failed to delete hotel"
  );
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const response = await fetch(apiUrl("/api/vehicles"), { method: "GET" });
  const result = await readJson<{ vehicles: Vehicle[] }>(
    response,
    "Failed to fetch vehicles"
  );
  return result.vehicles;
}

export async function saveVehicle(vehicle: Vehicle): Promise<Vehicle> {
  const isExisting = Boolean(vehicle.id);
  const response = await fetch(
    apiUrl(isExisting ? `/api/vehicles/${vehicle.id}` : "/api/vehicles"),
    {
      method: isExisting ? "PATCH" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicle),
    }
  );
  const result = await readJson<{ vehicle: Vehicle }>(
    response,
    "Failed to save vehicle"
  );
  return result.vehicle;
}

export async function deleteVehicle(id: string) {
  const response = await fetch(apiUrl(`/api/vehicles/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  return readJson<{ success: true; message: string }>(
    response,
    "Failed to delete vehicle"
  );
}

export async function uploadCatalogImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/api/uploads/catalog-image"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const result = await readJson<{ success: true; url: string; key: string }>(
    response,
    "Failed to upload image"
  );

  return {
    ...result,
    url: result.key ? mediaUrl(result.key) : mediaUrl(result.url),
  };
}
