const BASE_URL = "https://finnhub.io/api/v1";

export type Quote = {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // day open
  pc: number; // previous close
  t: number; // timestamp
};

export type CompanyNews = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // unix seconds
  related: string;
};

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY is not configured");

  const query = new URLSearchParams({ ...params, token: apiKey });
  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Finnhub request failed (${res.status}): ${path}`);
  }

  return res.json();
}

export async function getQuote(symbol: string): Promise<Quote> {
  return finnhubFetch<Quote>("/quote", { symbol });
}

export function mapQuote(q: Quote) {
  return {
    price: q.c,
    change: q.d,
    changePercent: q.dp,
    high: q.h,
    low: q.l,
    open: q.o,
    previousClose: q.pc,
  };
}

export async function getCompanyName(symbol: string): Promise<string | null> {
  try {
    const profile = await finnhubFetch<{ name?: string }>("/stock/profile2", { symbol });
    return profile.name || null;
  } catch {
    return null;
  }
}

export async function getCompanyNews(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<CompanyNews[]> {
  return finnhubFetch<CompanyNews[]>("/company-news", { symbol, from: fromDate, to: toDate });
}

export type EarningsEvent = {
  symbol: string;
  date: string; // YYYY-MM-DD
  hour: string; // "bmo" | "amc" | ""
  quarter: number;
  year: number;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
};

export async function getEarningsCalendar(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<EarningsEvent[]> {
  const data = await finnhubFetch<{ earningsCalendar: EarningsEvent[] }>("/calendar/earnings", {
    symbol,
    from: fromDate,
    to: toDate,
  });
  const events = data.earningsCalendar ?? [];

  const seenDates = new Set<string>();
  return events.filter((e) => {
    if (seenDates.has(e.date)) return false;
    seenDates.add(e.date);
    return true;
  });
}
