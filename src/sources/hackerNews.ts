import type { RadarItem, SourceFetchResult } from "../types.js";
import { fetchJson } from "../utils/http.js";
import { extractTags } from "../utils/score.js";

type HnItem = {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  time?: number;
  dead?: boolean;
  deleted?: boolean;
};

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

export async function fetchHackerNews(): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const [topIds, showIds] = await Promise.all([
    fetchJson<number[]>(`${HN_BASE}/topstories.json`, { timeoutMs: 20_000 }),
    fetchJson<number[]>(`${HN_BASE}/showstories.json`, { timeoutMs: 20_000 }),
  ]);

  const candidateIds = [...new Set([...showIds.slice(0, 80), ...topIds.slice(0, 120)])].slice(0, 160);
  const rawItems = await Promise.all(
    candidateIds.map((id) => fetchJson<HnItem | null>(`${HN_BASE}/item/${id}.json`, { timeoutMs: 15_000 }).catch(() => null)),
  );

  const items = rawItems
    .filter((item): item is HnItem => Boolean(item?.id && item.title && item.type === "story" && !item.dead && !item.deleted))
    .map(toRadarItem)
    .filter((item) => isUsefulHnCandidate(item))
    .slice(0, 35);

  if (!items.length) warnings.push("No HN candidates passed filters.");
  return { source: "hackernews", ok: true, items, warnings };
}

function toRadarItem(item: HnItem): RadarItem {
  const title = item.title ?? "Untitled Hacker News item";
  const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
  const tags = extractTags(title);

  return {
    id: `hn:${item.id}`,
    title,
    url,
    source: "hackernews",
    scoreRaw: item.score,
    commentsCount: item.descendants,
    tags,
    publishedAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
    metadata: {
      hnId: item.id,
      hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
    },
  };
}

function isUsefulHnCandidate(item: RadarItem): boolean {
  const title = item.title.toLowerCase();
  return (
    title.includes("show hn") ||
    item.tags.length > 0 ||
    (item.scoreRaw ?? 0) >= 150 ||
    (item.commentsCount ?? 0) >= 80
  );
}
