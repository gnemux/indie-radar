import type { RadarItem } from "../types.js";

const KEYWORDS = [
  "ai",
  "agent",
  "automation",
  "workflow",
  "developer tool",
  "devtool",
  "open source",
  "saas",
  "data",
  "analytics",
  "productivity",
  "chrome extension",
  "api",
];

export function normalizeAndRank(items: RadarItem[], maxItems = 45): RadarItem[] {
  const unique = dedupeByUrlOrTitle(items).filter((item) => item.title.trim() && item.url.trim());
  return unique
    .map((item) => ({ item, score: scoreRadarItem(item) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, maxItems)
    .map(({ item }) => item);
}

export function scoreRadarItem(item: RadarItem): number {
  const haystack = `${item.title} ${item.description ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  const keywordBoost = KEYWORDS.reduce((score, keyword) => score + (haystack.includes(keyword) ? 5 : 0), 0);
  const sourceWeight = item.source === "producthunt" ? 12 : item.source === "github" ? 10 : 8;
  const rawScore = Math.log10(Math.max(1, item.scoreRaw ?? 1)) * 10;
  const commentsScore = Math.log10(Math.max(1, item.commentsCount ?? 1)) * 4;
  const showHnBoost = item.title.toLowerCase().includes("show hn") ? 12 : 0;
  return sourceWeight + keywordBoost + rawScore + commentsScore + showHnBoost;
}

export function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  return KEYWORDS.filter((keyword) => lower.includes(keyword)).slice(0, 8);
}

function dedupeByUrlOrTitle(items: RadarItem[]): RadarItem[] {
  const seen = new Set<string>();
  const result: RadarItem[] = [];

  for (const item of items) {
    const key = normalizeUrl(item.url) || item.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
