import type { RadarItem, SourceFetchResult } from "../types.js";
import { scoreRadarItem } from "./score.js";

export function issueTitle(date: string): string {
  return `Daily Indie Radar｜${date}`;
}

export function formatFallbackReport(date: string, items: RadarItem[], sourceResults: SourceFetchResult[], reason: string): string {
  const topItems = [...items].sort((left, right) => scoreRadarItem(right) - scoreRadarItem(left)).slice(0, 3);

  return [
    `# Daily Indie Radar｜${date}`,
    "",
    `> LLM summary unavailable or skipped: ${reason}`,
    "",
    "---",
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
    "---",
    "",
    "## 全部候选产品分类速览",
    "",
    ...formatCategorizedOverview(items),
    "---",
    "",
    "## 今日趋势信号",
    "",
    "- 自动化、AI agent、开发者工具仍是优先观察方向。",
    "- GitHub/HN/Product Hunt 的热度只能代表早期注意力，不能直接代表付费意愿。",
    "- 优先选择能通过 3-5 次用户访谈验证的问题。",
    "",
  ].join("\n");
}

function formatCategorizedOverview(items: RadarItem[]): string[] {
  if (!items.length) return ["- 信息不足：本次没有可分类候选。"];

  const groups = new Map<string, RadarItem[]>();
  for (const item of items) {
    const category = fallbackCategory(item);
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }

  return [...groups.entries()].flatMap(([category, categoryItems]) => [
    `### ${category}`,
    "",
    ...categoryItems.map((item) => `- ${item.title}：${oneLineFallbackDescription(item)}`),
    "",
  ]);
}

function fallbackCategory(item: RadarItem): string {
  const haystack = `${item.title} ${item.description ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  if (haystack.includes("agent") || haystack.includes("workflow") || haystack.includes("automation")) {
    return "AI Agent / 工作流自动化";
  }
  if (haystack.includes("developer tool") || haystack.includes("devtool") || item.source === "github") {
    return "开发者工具 / 开源项目";
  }
  if (haystack.includes("local") || haystack.includes("privacy") || haystack.includes("mac")) {
    return "本地优先 / 隐私生产力工具";
  }
  if (haystack.includes("crm") || haystack.includes("vertical") || haystack.includes("home")) {
    return "垂直场景应用";
  }
  return "其他候选";
}

function oneLineFallbackDescription(item: RadarItem): string {
  const description = item.description ?? "无描述";
  const signal = item.tags.length ? `具备 ${item.tags.join(", ")} 信号` : "信号不足";
  return `${description}；${signal}，需要人工进一步判断是否值得继续看。`;
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
