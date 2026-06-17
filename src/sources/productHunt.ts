import type { AppConfig, RadarItem, SourceFetchResult } from "../types.js";
import { fetchJson } from "../utils/http.js";
import { extractTags } from "../utils/score.js";
import type { DayWindow } from "../utils/time.js";

type ProductHuntResponse = {
  data?: {
    posts?: {
      nodes?: ProductHuntPost[];
    };
  };
  errors?: Array<{ message?: string }>;
};

type ProductHuntPost = {
  id: string;
  name: string;
  tagline?: string | null;
  url: string;
  votesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: string | null;
  topics?: {
    nodes?: Array<{ name?: string | null; slug?: string | null }>;
  };
};

const QUERY = `
  query DailyPosts($postedAfter: DateTime!, $postedBefore: DateTime!) {
    posts(first: 25, featured: true, postedAfter: $postedAfter, postedBefore: $postedBefore, order: VOTES) {
      nodes {
        id
        name
        tagline
        url
        votesCount
        commentsCount
        createdAt
        topics(first: 6) {
          nodes {
            name
            slug
          }
        }
      }
    }
  }
`;

export async function fetchProductHunt(config: AppConfig, window: DayWindow): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  if (!config.productHuntToken) {
    return {
      source: "producthunt",
      ok: true,
      items: [],
      warnings: ["PRODUCT_HUNT_TOKEN is missing; Product Hunt source skipped."],
    };
  }

  const response = await fetchJson<ProductHuntResponse>("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.productHuntToken}`,
    },
    body: {
      query: QUERY,
      variables: {
        postedAfter: window.startIso,
        postedBefore: window.endIso,
      },
    },
    timeoutMs: 25_000,
  });

  if (response.errors?.length) {
    throw new Error(response.errors.map((error) => error.message ?? "Unknown Product Hunt error").join("; "));
  }

  const items = (response.data?.posts?.nodes ?? []).map(toRadarItem);
  if (!items.length) warnings.push("No Product Hunt posts returned for the report window.");
  return { source: "producthunt", ok: true, items, warnings };
}

function toRadarItem(post: ProductHuntPost): RadarItem {
  const topicTags = (post.topics?.nodes ?? [])
    .map((topic) => topic.slug ?? topic.name ?? "")
    .filter(Boolean);
  const tags = [...new Set([...extractTags(`${post.name} ${post.tagline ?? ""}`), ...topicTags])];

  return {
    id: `producthunt:${post.id}`,
    title: post.name,
    url: post.url,
    source: "producthunt",
    description: post.tagline ?? undefined,
    scoreRaw: post.votesCount ?? undefined,
    commentsCount: post.commentsCount ?? undefined,
    tags,
    publishedAt: post.createdAt ?? undefined,
    metadata: {
      votes: post.votesCount ?? null,
      comments: post.commentsCount ?? null,
    },
  };
}
