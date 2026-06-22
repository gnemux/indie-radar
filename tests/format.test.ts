import assert from "node:assert/strict";
import test from "node:test";
import type { RadarItem, SourceFetchResult } from "../src/types.js";
import { formatFallbackReport } from "../src/utils/format.js";

test("fallback report uses categorized overview instead of ignored noise section", () => {
  const items: RadarItem[] = [
    {
      id: "1",
      title: "Agent Workflow Tool",
      url: "https://example.com/agent",
      source: "hackernews",
      description: "Automates founder workflows.",
      tags: ["agent", "workflow"],
    },
    {
      id: "2",
      title: "Local Privacy Notes",
      url: "https://example.com/local",
      source: "producthunt",
      description: "A local-first private notes app.",
      tags: ["productivity"],
    },
  ];
  const sourceResults: SourceFetchResult[] = [
    { source: "hackernews", ok: true, items: [items[0]!], warnings: [] },
    { source: "producthunt", ok: true, items: [items[1]!], warnings: [] },
  ];

  const report = formatFallbackReport("2026-06-22", items, sourceResults, "test");
  assert.match(report, /## 全部候选产品分类速览/);
  assert.doesNotMatch(report, /建议忽略的噪声/);
  assert.doesNotMatch(report, /可转成 Linear 任务的 Action Items/);
  assert.doesNotMatch(report, /数据源状态/);
  assert.equal((report.match(/^---$/gm) ?? []).length, 3);
  assert.match(report, /Agent Workflow Tool/);
  assert.match(report, /Local Privacy Notes/);
});
