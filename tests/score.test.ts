import assert from "node:assert/strict";
import test from "node:test";
import type { RadarItem } from "../src/types.js";
import { normalizeAndRank } from "../src/utils/score.js";

test("ranking deduplicates and prioritizes stronger indie signals", () => {
  const items: RadarItem[] = [
    {
      id: "1",
      title: "Generic launch",
      url: "https://example.com/a",
      source: "hackernews",
      tags: [],
      scoreRaw: 10,
    },
    {
      id: "2",
      title: "AI agent workflow automation for developer tools",
      url: "https://example.com/b",
      source: "github",
      tags: ["ai", "agent", "workflow", "developer tool"],
      scoreRaw: 1000,
    },
    {
      id: "3",
      title: "Duplicate",
      url: "https://example.com/b",
      source: "producthunt",
      tags: ["ai"],
      scoreRaw: 1,
    },
  ];

  const ranked = normalizeAndRank(items);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.id, "2");
});
