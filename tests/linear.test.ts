import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueCreateInput } from "../src/services/linear.js";
import type { AppConfig } from "../src/types.js";

const baseConfig: AppConfig = {
  openrouterApiKey: undefined,
  openrouterModel: "qwen/qwen3.7-max",
  openrouterMaxTokens: 5000,
  openrouterHttpReferer: undefined,
  openrouterAppTitle: "Indie Opportunity Radar",
  linearApiKey: "linear-key",
  linearTeamId: "team-id",
  linearProjectId: "project-id",
  linearParentIssueId: undefined,
  linearStateId: undefined,
  linearLabelIds: [],
  linearOnDuplicate: "update",
  allowProjectlessLinear: false,
  githubToken: undefined,
  productHuntToken: undefined,
  timezone: "Asia/Shanghai",
  runDate: undefined,
  dryRun: false,
  skipLlm: false,
  skipLinear: false,
  mockSources: false,
  promptPath: "prompts/daily-radar.md",
  maxCandidatesForLlm: 35,
};

test("Linear issue creation includes optional parent issue", () => {
  const input = buildIssueCreateInput(
    { ...baseConfig, linearParentIssueId: "parent-issue-id", linearLabelIds: ["label-id"] },
    "Daily Indie Radar｜2026-06-17",
    "report",
  );

  assert.deepEqual(input, {
    teamId: "team-id",
    title: "Daily Indie Radar｜2026-06-17",
    description: "report",
    projectId: "project-id",
    parentId: "parent-issue-id",
    labelIds: ["label-id"],
  });
});
