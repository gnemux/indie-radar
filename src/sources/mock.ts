import type { SourceFetchResult } from "../types.js";

export function fetchMockSources(): SourceFetchResult[] {
  return [
    {
      source: "hackernews",
      ok: true,
      warnings: [],
      items: [
        {
          id: "mock:hn:1",
          title: "Show HN: Agentic workflow builder for solo SaaS operators",
          url: "https://news.ycombinator.com/item?id=1",
          source: "hackernews",
          description: "A small tool for automating repetitive founder workflows.",
          scoreRaw: 210,
          commentsCount: 88,
          tags: ["agent", "workflow", "automation", "saas"],
        },
      ],
    },
    {
      source: "github",
      ok: true,
      warnings: [],
      items: [
        {
          id: "mock:github:1",
          title: "solo-dev/local-analytics-agent",
          url: "https://github.com/solo-dev/local-analytics-agent",
          source: "github",
          description: "Open-source local analytics agent for privacy-sensitive indie apps.",
          scoreRaw: 1200,
          tags: ["ai", "agent", "analytics", "open source"],
          metadata: { language: "TypeScript", stars: 1200 },
        },
      ],
    },
    {
      source: "producthunt",
      ok: true,
      warnings: [],
      items: [
        {
          id: "mock:ph:1",
          title: "Micro CRM Copilot",
          url: "https://www.producthunt.com/posts/micro-crm-copilot",
          source: "producthunt",
          description: "A lightweight CRM assistant for freelancers and tiny agencies.",
          scoreRaw: 360,
          commentsCount: 42,
          tags: ["ai", "productivity", "automation"],
        },
      ],
    },
  ];
}
