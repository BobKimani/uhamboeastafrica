async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  let result: { error?: string } = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok ? "Currency returned an invalid response" : text.slice(0, 300)
      );
    }
  }

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch exchange rate");
  }

  return result;
}

export async function fetchUsdKesRate() {
  const response = await fetch("/api/currency/usd-kes", {
    cache: "no-store",
  });
  const result = await readJson(response);

  return result.data as {
    rate: number;
    source: string;
    date: string;
    cached: boolean;
  };
}
