import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import {
  getNewsByCategory,
  getTopStories,
  searchNews,
  isPublishedToday,
  resolveSource,
  resolveImage,
  type CurrentsArticle,
} from "@/lib/currents";
import { NEWS_COUNTRIES } from "@/lib/newsCountries";
import { summarize } from "@/lib/gemini";
import type { NewsArticle, NewsTopicGroup } from "@/lib/types";

const SUMMARY_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ARTICLES = 10;
const MAX_HEADLINES = 3;
const MAX_TOP_STORIES = 6;

function mapArticle(a: CurrentsArticle): NewsArticle {
  return {
    id: a.id,
    title: a.title,
    url: a.url,
    source: resolveSource(a),
    image: resolveImage(a),
    published: a.published,
  };
}

async function buildSummary(
  label: string,
  countryName: string | null,
  articles: CurrentsArticle[],
): Promise<string> {
  if (articles.length === 0) return "No recent articles found for this topic.";
  if (!process.env.GEMINI_API_KEY) {
    return `${articles.length} recent article(s) — AI summary unavailable (no GEMINI_API_KEY configured).`;
  }

  const top = articles.slice(0, MAX_ARTICLES);
  const list = top
    .map((a, i) => `${i + 1}. ${a.title}${a.description ? ` — ${a.description}` : ""}`)
    .join("\n");
  const scopeNote = countryName ? ` with a focus on ${countryName}` : "";

  const prompt = `You are summarizing recent news for the topic "${label}"${scopeNote}.

Here are the most recent headlines:
${list}

Write a concise 2-3 sentence summary in plain prose with no markdown. Lead with what actually happened, then briefly note why it matters if that's clear from the headlines.`;

  try {
    const text = await summarize(prompt);
    return text || "Could not generate a summary right now.";
  } catch {
    return "Could not generate a summary right now.";
  }
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.CURRENTS_API_KEY) {
    return NextResponse.json({ configured: false, country: null, topStories: [], groups: [] });
  }

  const [user, topics] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { newsCountry: true } }),
    prisma.newsTopic.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const country = user?.newsCountry ?? null;
  const countryName = country ? NEWS_COUNTRIES.find((c) => c.code === country)?.name ?? null : null;

  const [topStoriesRaw, groups] = await Promise.all([
    getTopStories(country).catch(() => [] as CurrentsArticle[]),
    Promise.all(
      topics.map(async (t): Promise<NewsTopicGroup> => {
        const articles = await (t.kind === "category"
          ? getNewsByCategory(t.value, country)
          : searchNews(t.value, country)
        ).catch(() => [] as CurrentsArticle[]);

        const isFresh = t.summary && t.summaryAt && Date.now() - t.summaryAt.getTime() < SUMMARY_TTL_MS;
        const summary = isFresh ? t.summary! : await buildSummary(t.label, countryName, articles);

        if (!isFresh) {
          await prisma.newsTopic.update({ where: { id: t.id }, data: { summary, summaryAt: new Date() } });
        }

        return {
          id: t.id,
          label: t.label,
          kind: t.kind as "category" | "keyword",
          summary,
          headlines: articles
            .filter((a) => isPublishedToday(a.published))
            .slice(0, MAX_HEADLINES)
            .map(mapArticle),
          articles: articles.slice(0, MAX_ARTICLES).map(mapArticle),
        };
      }),
    ),
  ]);

  const topStories = topStoriesRaw.slice(0, MAX_TOP_STORIES).map(mapArticle);

  return NextResponse.json({ configured: true, country, topStories, groups });
}
