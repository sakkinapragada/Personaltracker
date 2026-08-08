"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { NewsArticle, NewsData, NewsTopic } from "@/lib/types";
import { NEWS_CATEGORIES } from "@/lib/newsCategories";
import { NEWS_COUNTRIES } from "@/lib/newsCountries";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Thumb({ article, size }: { article: NewsArticle; size: number }) {
  if (!article.image) {
    return (
      <div
        className="flex-shrink-0 rounded-lg bg-accent-soft"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={article.image}
      alt=""
      className="flex-shrink-0 rounded-lg bg-paper object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function HeadlineRow({
  article,
  size = 44,
  bleed = true,
}: {
  article: NewsArticle;
  size?: number;
  bleed?: boolean;
}) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 transition ${
        bleed ? "px-4 py-3 hover:bg-paper" : "py-2"
      }`}
    >
      <Thumb article={article} size={size} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-ink">{article.title}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {article.source} · {formatRelativeTime(article.published)}
        </p>
      </div>
    </a>
  );
}

function SkeletonBlock() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 h-3 w-20 animate-pulse rounded bg-rule" />
        <div className="h-48 animate-pulse rounded-xl bg-rule" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-lg bg-rule" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-rule" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-rule" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [topics, setTopics] = useState<NewsTopic[]>([]);
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"category" | "keyword">("category");
  const [category, setCategory] = useState<string>(NEWS_CATEGORIES[0]);
  const [keyword, setKeyword] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("");
  const [savingCountry, setSavingCountry] = useState(false);

  async function load() {
    setLoading(true);
    const [topicsRes, newsRes] = await Promise.all([fetch("/api/news/topics"), fetch("/api/news")]);
    if (topicsRes.ok) {
      setTopics(await topicsRes.json());
    }
    if (newsRes.ok) {
      const data: NewsData = await newsRes.json();
      setNews(data);
      setCountry(data.country ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const value = mode === "category" ? category : keyword.trim();
    if (!value) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/news/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: mode, value }),
    });
    setAdding(false);
    if (res.ok) {
      setKeyword("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add topic");
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/news/topics/${id}`, { method: "DELETE" });
    load();
  }

  async function handleCountryChange(value: string) {
    setCountry(value);
    setSavingCountry(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsCountry: value || null }),
    });
    setSavingCountry(false);
    load();
  }

  const topStories = news?.topStories ?? [];
  const hero = topStories[0];
  const rest = topStories.slice(1);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink">News</h1>
          <p className="text-sm text-ink-soft">Top stories, plus AI summaries for what you follow.</p>
        </div>
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={savingCountry}
          aria-label="News country"
          className="flex-shrink-0 rounded-lg border border-rule bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="">All countries</option>
          {NEWS_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!news?.configured && !loading && (
        <p className="mb-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
          News fetching isn&apos;t connected yet — once the Currents API key is configured,
          you&apos;ll see stories here.
        </p>
      )}

      {loading ? (
        <SkeletonBlock />
      ) : (
        <div className="space-y-10">
          {topStories.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Top Stories
              </p>

              {hero && (
                <a
                  href={hero.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 block overflow-hidden rounded-xl border border-rule bg-surface shadow-sm transition hover:shadow-md"
                >
                  {hero.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.image} alt="" className="h-48 w-full bg-paper object-cover sm:h-64" />
                  )}
                  <div className="p-4">
                    <p className="text-lg font-semibold leading-snug text-ink">{hero.title}</p>
                    <p className="mt-1.5 text-xs text-ink-soft">
                      {hero.source} · {formatRelativeTime(hero.published)}
                    </p>
                  </div>
                </a>
              )}

              {rest.length > 0 && (
                <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface shadow-sm">
                  {rest.map((a) => (
                    <HeadlineRow key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">For You</p>

            <form onSubmit={handleAdd} className="mb-5 flex flex-wrap items-center gap-2">
                <div className="flex rounded-full border border-rule p-1">
                  <button
                    type="button"
                    onClick={() => setMode("category")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      mode === "category" ? "bg-accent text-white" : "text-ink-soft"
                    }`}
                  >
                    Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("keyword")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      mode === "keyword" ? "bg-accent text-white" : "text-ink-soft"
                    }`}
                  >
                    Keyword
                  </button>
                </div>

                {mode === "category" ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-lg border border-rule px-3 py-2 text-sm capitalize focus:border-accent focus:outline-none"
                  >
                    {NEWS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. Tesla, F1, Singapore politics"
                    className="w-56 rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                )}

                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
                >
                  {adding ? "Adding…" : "Add"}
                </button>
            </form>

            {error && <p className="mb-4 text-sm text-rose">{error}</p>}

            {topics.length === 0 ? (
              <p className="text-sm text-ink-soft">No topics yet — add one above.</p>
            ) : (
              <div className="space-y-4">
                {topics.map((t) => {
                  const group = news?.groups.find((g) => g.id === t.id);
                  const fromToday = group && group.headlines.length > 0;
                  const headlinesToShow = group
                    ? fromToday
                      ? group.headlines
                      : group.articles.slice(0, 3)
                    : [];

                  return (
                    <div key={t.id} className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold capitalize text-ink">{t.label}</p>
                          <p className="text-xs text-ink-faint">
                            {t.kind === "category" ? "Category" : "Keyword"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(t.id)}
                          className="text-xs font-medium text-ink-faint hover:text-rose"
                        >
                          Remove
                        </button>
                      </div>

                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        AI Summary
                      </p>
                      <p className="mb-4 text-sm text-ink">
                        {group ? group.summary : news?.configured ? "Loading summary…" : "Waiting on the news provider."}
                      </p>

                      {headlinesToShow.length > 0 ? (
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
                            {fromToday ? "Today" : "Recent"}
                          </p>
                          <div className="divide-y divide-rule">
                            {headlinesToShow.map((a) => (
                              <HeadlineRow key={a.id} article={a} size={36} bleed={false} />
                            ))}
                          </div>
                        </div>
                      ) : group ? (
                        <p className="text-xs text-ink-soft">No recent articles found for this topic.</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
