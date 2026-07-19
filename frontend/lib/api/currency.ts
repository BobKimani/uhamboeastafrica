import { apiUrl, readJson } from "@/lib/api/client";

export async function fetchUsdKesRate() {
  const response = await fetch(apiUrl("/api/currency/usd-kes"), {
    cache: "no-store",
  });
  const result = await readJson<{
    data: {
      rate: number;
      source: string;
      date: string;
      cached: boolean;
    };
  }>(response, "Failed to fetch exchange rate");

  return result.data;
}

export async function convertUsdToKes(amountUsd: number) {
  const response = await fetch(apiUrl("/api/currency/convert-usd-to-kes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountUsd }),
  });
  const result = await readJson<{
    data: {
      amountUsd: number;
      exchangeRate: number;
      amountKes: number;
      source: string;
      rateDate: string;
    };
  }>(response, "Failed to convert currency");

  return result.data;
}
