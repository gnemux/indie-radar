import type { RadarItem, SourceFetchResult } from "../types.js";
import { scoreRadarItem } from "./score.js";

export function issueTitle(date: string): string {
  return `Daily Indie Radar｜${date}`;
}

export function formatFallbackReport(date: string, items: RadarItem[], sourceResults: SourceFetchResult[], reason: string): string {
  const topItems = [...items].sort((left, right) => scoreRadarItem(right) - scoreRadarItem(left)).slice(0, 3);
  const ignored = [...items].slice(3, 6);

  return [
    `# Daily Indie Radar｜${date}`,
    "",
    `> LLM summary unavailable or skipped: ${reason}`,
    "",
    "## 今日 Top 3 机会",
    "",
    ...topItems.flatMap((item, index) => [
      `### ${index + 1}. ${item.title}`,
      `- 来源：${item.source}`,
      `- URL：${item.url}`,
      `- 解决的问题：需要人工进一步判断。候选描述：${item.description ?? "无描述"}`,
      `- 用户是谁：从标题和描述推断，可能是开发者、创作者或小团队。`,
      `- 为什么可能付费：候选具有 ${item.tags.length ? item.tags.join(", ") : "效率或工具"} 信号，需要验证真实痛点。`,
      `- 独立开发价值：可以作为访谈和竞品拆解对象。`,
      `- 风险/不确定性：未经过 LLM 深度筛选，需人工复核。`,
      `- 建议动作：打开链接，记录目标用户、定价页、替代方案，并挑一个最小验证假设。`,
      "",
    ]),
    "## 建议忽略的噪声",
    "",
    ...ignored.map((item) => `- ${item.title}：排序靠后或信号不足，先不投入深度研究。`),
    "",
    "## 今日趋势信号",
    "",
    "- 自动化、AI agent、开发者工具仍是优先观察方向。",
    "- GitHub/HN/Product Hunt 的热度只能代表早期注意力，不能直接代表付费意愿。",
    "- 优先选择能通过 3-5 次用户访谈验证的问题。",
    "",
    "## 可转成 Linear 任务的 Action Items",
    "",
    "- [ ] 从 Top 3 中选择 1 个做 30 分钟竞品拆解",
    "- [ ] 找到 3 个潜在用户并验证是否愿意为该问题付费",
    "- [ ] 写出 1 个 1 周内可完成的 MVP 假设",
    "",
    "## 数据源状态",
    "",
    ...sourceResults.map((result) =>
      `- ${result.source}：${result.ok ? "ok" : "failed"}${result.error ? `，${result.error}` : ""}${result.warnings.length ? `，${result.warnings.join("; ")}` : ""}`,
    ),
    "",
  ].join("\n");
}

export function formatItemsForPrompt(items: RadarItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      description: item.description,
      scoreRaw: item.scoreRaw,
      commentsCount: item.commentsCount,
      tags: item.tags,
      publishedAt: item.publishedAt,
      metadata: item.metadata,
    })),
    null,
    2,
  );
}
