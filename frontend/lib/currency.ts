export type DisplayCurrency = "KES" | "USD";

export const DEFAULT_CURRENCY: DisplayCurrency = "KES";
export const USD_TO_KES = 130;

export function convertFromUsd(amountUsd: number, currency: DisplayCurrency) {
  return currency === "KES" ? amountUsd * USD_TO_KES : amountUsd;
}

export function formatTravelPrice(
  amountUsd: number,
  currency: DisplayCurrency = DEFAULT_CURRENCY
) {
  const amount = convertFromUsd(amountUsd, currency);
  const locale = currency === "KES" ? "en-KE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format an amount that is natively in KES (e.g. route-priced transport). */
export function formatFromKes(
  amountKes: number,
  currency: DisplayCurrency = DEFAULT_CURRENCY,
  usdToKes: number = USD_TO_KES
) {
  const amount = currency === "KES" ? amountKes : amountKes / usdToKes;
  const locale = currency === "KES" ? "en-KE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
