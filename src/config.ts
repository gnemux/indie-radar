import type { AppConfig, LinearDuplicatePolicy } from "./types.js";
import { getBooleanEnv, getCsvEnv, getIntegerEnv, getOptionalEnv, loadDotEnv } from "./utils/env.js";

export function loadConfig(): AppConfig {
  loadDotEnv();

  const dryRun = getBooleanEnv("DRY_RUN", false);
  const openrouterApiKey = getOptionalEnv("OPENROUTER_API_KEY");
  const skipLlm = getBooleanEnv("SKIP_LLM", false) || (dryRun && !openrouterApiKey);
  const linearOnDuplicate = parseDuplicatePolicy(getOptionalEnv("LINEAR_ON_DUPLICATE") ?? "update");

  return {
    openrouterApiKey,
    openrouterModel: getOptionalEnv("OPENROUTER_MODEL") ?? "qwen/qwen3.7-max",
    openrouterMaxTokens: getIntegerEnv("OPENROUTER_MAX_TOKENS", 5000),
    openrouterHttpReferer: getOptionalEnv("OPENROUTER_HTTP_REFERER"),
    openrouterAppTitle: getOptionalEnv("OPENROUTER_APP_TITLE") ?? "Indie Opportunity Radar",
    linearApiKey: getOptionalEnv("LINEAR_API_KEY"),
    linearTeamId: getOptionalEnv("LINEAR_TEAM_ID"),
    linearProjectId: getOptionalEnv("LINEAR_PROJECT_ID"),
    linearParentIssueId: getOptionalEnv("LINEAR_PARENT_ISSUE_ID"),
    linearStateId: getOptionalEnv("LINEAR_STATE_ID"),
    linearLabelIds: getCsvEnv("LINEAR_LABEL_IDS"),
    linearOnDuplicate,
    allowProjectlessLinear: getBooleanEnv("ALLOW_PROJECTLESS_LINEAR", false),
    githubToken: getOptionalEnv("GITHUB_TOKEN"),
    productHuntToken: getOptionalEnv("PRODUCT_HUNT_TOKEN"),
    timezone: getOptionalEnv("TIMEZONE") ?? "Asia/Shanghai",
    runDate: getOptionalEnv("RUN_DATE"),
    dryRun,
    skipLlm,
    skipLinear: getBooleanEnv("SKIP_LINEAR", false),
    mockSources: getBooleanEnv("MOCK_SOURCES", false),
    promptPath: getOptionalEnv("PROMPT_PATH") ?? "prompts/daily-radar.md",
    maxCandidatesForLlm: getIntegerEnv("MAX_CANDIDATES_FOR_LLM", 35),
  };
}

export function validateConfig(config: AppConfig): void {
  if (!isValidTimezone(config.timezone)) {
    throw new Error(`Invalid TIMEZONE: ${config.timezone}`);
  }

  if (config.runDate && !/^\d{4}-\d{2}-\d{2}$/.test(config.runDate)) {
    throw new Error("RUN_DATE must be YYYY-MM-DD.");
  }

  if (!config.skipLlm && !config.openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required unless SKIP_LLM=true or DRY_RUN=true.");
  }

  if (!config.dryRun && !config.skipLinear) {
    if (!config.linearApiKey) throw new Error("LINEAR_API_KEY is required for real Linear publishing.");
    if (!config.linearTeamId) throw new Error("LINEAR_TEAM_ID is required for real Linear publishing.");
    if (!config.linearProjectId && !config.allowProjectlessLinear) {
      throw new Error("LINEAR_PROJECT_ID is required. Set ALLOW_PROJECTLESS_LINEAR=true only if you intentionally want projectless issues.");
    }
  }
}

function parseDuplicatePolicy(value: string): LinearDuplicatePolicy {
  if (value === "skip" || value === "update") return value;
  throw new Error("LINEAR_ON_DUPLICATE must be skip or update.");
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
