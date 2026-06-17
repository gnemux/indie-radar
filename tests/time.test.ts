import assert from "node:assert/strict";
import test from "node:test";
import { getDayWindow } from "../src/utils/time.js";

test("Asia/Tokyo day window maps to UTC boundaries", () => {
  const window = getDayWindow("Asia/Tokyo", "2026-06-17");
  assert.equal(window.startIso, "2026-06-16T15:00:00.000Z");
  assert.equal(window.endIso, "2026-06-17T15:00:00.000Z");
});

test("Asia/Shanghai day window maps to UTC boundaries", () => {
  const window = getDayWindow("Asia/Shanghai", "2026-06-17");
  assert.equal(window.startIso, "2026-06-16T16:00:00.000Z");
  assert.equal(window.endIso, "2026-06-17T16:00:00.000Z");
});
