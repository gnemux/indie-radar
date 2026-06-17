import type { AppConfig, RadarItem, SourceFetchResult } from "../types.js";
import { fetchJson } from "../utils/http.js";
import { extractTags } from "../utils/score.js";
import { addDaysToDateString } from "../utils/time.js";

type GitHubSearchResponse = {
  incomplete_results?: boolean;
  items?: GitHubRepo[];
};

type GitHubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
};

const KEYWORDS = ["ai", "agent", "automation", "workflow", "developer-tool", "data", "open-source"];

export async function fetchGitHub(config: AppConfig, reportDate: string): Promise<SourceFetchResult> {
  const warnings: string[] = [];
  const since = addDaysToDateString(reportDate, -2);
  const headers: Record<string, string> = {
    "User-Agent": "indie-opportunity-radar",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (config.githubToken) headers.Authorization = `Bearer ${config.githubToken}`;

  const results = await Promise.all(
    KEYWORDS.map((keyword) => searchRepos(keyword, since, headers).catch((error: unknown) => {
      warnings.push(`GitHub query failed for ${keyword}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    })),
  );

  const repos = results.flat();
  if (!repos.length) warnings.push("No GitHub repositories returned.");

  const items = repos.map(toRadarItem);
  return { source: "github", ok: true, items, warnings };
}

async function searchRepos(keyword: string, since: string, headers: Record<string, string>): Promise<GitHubRepo[]> {
  const query = `${keyword} in:name,description,readme pushed:>${since} stars:>20 fork:false archived:false`;
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "8");

  const response = await fetchJson<GitHubSearchResponse>(url.toString(), { headers, timeoutMs: 20_000 });
  return response.items ?? [];
}

function toRadarItem(repo: GitHubRepo): RadarItem {
  const title = repo.full_name;
  const tags = [...new Set([...extractTags(`${title} ${repo.description ?? ""}`), ...(repo.topics ?? []).slice(0, 6)])];

  return {
    id: `github:${repo.id}`,
    title,
    url: repo.html_url,
    source: "github",
    description: repo.description ?? undefined,
    scoreRaw: repo.stargazers_count,
    tags,
    publishedAt: repo.pushed_at,
    metadata: {
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    },
  };
}
