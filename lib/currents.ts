const BASE_URL = "https://api.currentsapi.services/v1";

export type CurrentsArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  author: string;
  image: string;
  published: string; // e.g. "2026-08-08 10:00:00 +0000"
  category: string[];
};

async function currentsFetch(path: string, params: Record<string, string>): Promise<CurrentsArticle[]> {
  const apiKey = process.env.CURRENTS_API_KEY;
  if (!apiKey) throw new Error("CURRENTS_API_KEY is not configured");

  const query = new URLSearchParams({ ...params, language: "en", apiKey });
  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Currents API request failed (${res.status}): ${path}`);
  }

  const data = await res.json();
  return data.news ?? [];
}

export async function getNewsByCategory(category: string, country?: string | null): Promise<CurrentsArticle[]> {
  return currentsFetch("/latest-news", { category, ...(country && { country }) });
}

export async function searchNews(keywords: string, country?: string | null): Promise<CurrentsArticle[]> {
  return currentsFetch("/search", { keywords, ...(country && { country }) });
}

export async function getTopStories(country?: string | null): Promise<CurrentsArticle[]> {
  // "top" is listed in /available/categories but is rejected by /latest-news as an
  // invalid v1 category (confirmed against the live API) — "general" is the real
  // catch-all/top-headlines category for this endpoint.
  return currentsFetch("/latest-news", { category: "general", ...(country && { country }) });
}

export function resolveSource(article: CurrentsArticle): string {
  if (article.author && article.author.trim()) return article.author.trim();
  try {
    return new URL(article.url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown source";
  }
}

export function resolveImage(article: CurrentsArticle): string | null {
  const img = article.image?.trim();
  if (!img || img === "None" || !/^https?:\/\//.test(img)) return null;
  return img;
}

function singaporeDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(d);
}

export function isPublishedToday(published: string): boolean {
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return false;
  return singaporeDateKey(d) === singaporeDateKey(new Date());
}
