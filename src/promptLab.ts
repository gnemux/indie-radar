import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { loadConfig, validateConfig } from "./config.js";
import { generateReport } from "./services/llm.js";
import type { RadarItem, SourceFetchResult, SourceName } from "./types.js";
import { normalizeAndRank } from "./utils/score.js";
import { getReportDate } from "./utils/time.js";

type PromptLabFixture = {
  date?: string;
  items: RadarItem[];
};

const DEFAULT_FIXTURE_PATH = "fixtures/prompt-lab-items.json";

async function main(): Promise<void> {
  const config = loadConfig();
  const fixturePath = process.env.PROMPT_LAB_FIXTURE?.trim() || DEFAULT_FIXTURE_PATH;
  const fixture = await loadFixture(fixturePath);
  const date = process.env.PROMPT_LAB_DATE?.trim() || config.runDate || fixture.date || getReportDate(config.timezone);
  const labConfig = {
    ...config,
    dryRun: true,
    skipLinear: true,
    runDate: date,
  };
  validateConfig(labConfig);

  const rankedItems = normalizeAndRank(fixture.items);
  const sourceResults = buildSourceResults(fixture.items);
  const report = await generateReport(labConfig, date, rankedItems, sourceResults);

  await mkdir("output", { recursive: true });
  const outputPath = buildOutputPath(date, config.promptPath, fixturePath);
  const header = [
    "<!--",
    "Prompt Lab",
    `date: ${date}`,
    `prompt: ${config.promptPath}`,
    `fixture: ${fixturePath}`,
    `model: ${config.openrouterModel}`,
    `usedFallback: ${String(report.usedFallback)}`,
    "-->",
    "",
  ].join("\n");

  await writeFile(outputPath, `${header}${report.markdown}`, "utf8");
  console.log(`Prompt Lab wrote report: ${outputPath}`);
  if (report.usedFallback) console.warn("Prompt Lab used fallback formatter.");
}

async function loadFixture(path: string): Promise<PromptLabFixture> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as PromptLabFixture;
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error(`Prompt lab fixture must contain a non-empty items array: ${path}`);
  }
  return parsed;
}

function buildSourceResults(items: RadarItem[]): SourceFetchResult[] {
  const sources: SourceName[] = ["hackernews", "github", "producthunt"];
  return sources.map((source) => ({
    source,
    ok: true,
    items: items.filter((item) => item.source === source),
    warnings: [],
  }));
}

function buildOutputPath(date: string, promptPath: string, fixturePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `output/prompt-lab-${date}-${fileStem(promptPath)}-${fileStem(fixturePath)}-${timestamp}.md`;
}

function fileStem(path: string): string {
  const name = basename(path, extname(path));
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "file";
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
