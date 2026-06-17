import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig, validateConfig } from "./config.js";
import { fetchGitHub } from "./sources/github.js";
import { fetchHackerNews } from "./sources/hackerNews.js";
import { fetchMockSources } from "./sources/mock.js";
import { fetchProductHunt } from "./sources/productHunt.js";
import { generateReport } from "./services/llm.js";
import { publishToLinear } from "./services/linear.js";
import type { RadarItem, SourceFetchResult } from "./types.js";
import { issueTitle } from "./utils/format.js";
import { summarizeError } from "./utils/http.js";
import { normalizeAndRank } from "./utils/score.js";
import { getDayWindow, getReportDate } from "./utils/time.js";

async function main(): Promise<void> {
  const config = loadConfig();
  validateConfig(config);

  const date = getReportDate(config.timezone, config.runDate);
  const window = getDayWindow(config.timezone, date);
  const title = issueTitle(date);

  console.log(`Generating ${title}`);
  console.log(`Window: ${window.startIso} to ${window.endIso} (${config.timezone})`);
  console.log(`Mode: dryRun=${config.dryRun}, skipLlm=${config.skipLlm}, skipLinear=${config.skipLinear}, mockSources=${config.mockSources}`);

  const sourceResults = config.mockSources ? fetchMockSources() : await fetchSources(config, date, window);
  const allItems = sourceResults.flatMap((result) => result.items);
  const rankedItems = normalizeAndRank(allItems);

  console.log(`Collected ${allItems.length} raw items; ${rankedItems.length} candidates after ranking.`);
  for (const result of sourceResults) {
    console.log(`${result.source}: ${result.ok ? "ok" : "failed"} (${result.items.length} items)`);
    for (const warning of result.warnings) console.warn(`${result.source} warning: ${warning}`);
    if (result.error) console.warn(`${result.source} error: ${result.error}`);
  }

  const report = await generateReport(config, date, rankedItems, sourceResults);
  if (report.usedFallback) console.warn("Report used fallback formatter.");

  await mkdir("output", { recursive: true });
  const outputPath = `output/daily-${date}.md`;
  await writeFile(outputPath, report.markdown, "utf8");
  console.log(`Wrote report: ${outputPath}`);

  const publishResult = await publishToLinear(config, title, report.markdown);
  if (publishResult.action === "created" || publishResult.action === "updated") {
    console.log(`Linear issue ${publishResult.action}: ${publishResult.issue?.identifier} ${publishResult.issue?.url ?? ""}`);
  } else {
    console.log(`Linear publishing skipped: ${publishResult.warning ?? "no-op"}`);
    if (publishResult.issue) console.log(`Existing issue: ${publishResult.issue.identifier} ${publishResult.issue.url ?? ""}`);
  }
}

async function fetchSources(config: ReturnType<typeof loadConfig>, date: string, window: ReturnType<typeof getDayWindow>): Promise<SourceFetchResult[]> {
  const tasks: Array<Promise<SourceFetchResult>> = [
    safeSource("hackernews", () => fetchHackerNews()),
    safeSource("github", () => fetchGitHub(config, date)),
    safeSource("producthunt", () => fetchProductHunt(config, window)),
  ];

  return Promise.all(tasks);
}

async function safeSource(
  source: SourceFetchResult["source"],
  fetcher: () => Promise<SourceFetchResult>,
): Promise<SourceFetchResult> {
  try {
    return await fetcher();
  } catch (error) {
    return {
      source,
      ok: false,
      items: [] as RadarItem[],
      warnings: [],
      error: summarizeError(error),
    };
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
