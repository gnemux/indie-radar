import { readFile } from "node:fs/promises";
import type { AppConfig, RadarItem, SourceFetchResult } from "../types.js";
import { fetchJson, summarizeError } from "../utils/http.js";
import { formatFallbackReport, formatItemsForPrompt } from "../utils/format.js";

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

export async function generateReport(
  config: AppConfig,
  date: string,
  items: RadarItem[],
  sourceResults: SourceFetchResult[],
): Promise<{ markdown: string; usedFallback: boolean }> {
  if (config.skipLlm) {
    return {
      markdown: formatFallbackReport(date, items, sourceResults, "SKIP_LLM=true or OPENROUTER_API_KEY missing during dry-run"),
      usedFallback: true,
    };
  }

  try {
    const promptTemplate = await readFile(config.promptPath, "utf8");
    const prompt = promptTemplate.replaceAll("{{date}}", date);
    const input = [
      `Report date: ${date}`,
      "",
      "Source health:",
      JSON.stringify(
        sourceResults.map((result) => ({
          source: result.source,
          ok: result.ok,
          warnings: result.warnings,
          error: result.error,
          itemCount: result.items.length,
        })),
        null,
        2,
      ),
      "",
      "Candidate items:",
      formatItemsForPrompt(items.slice(0, config.maxCandidatesForLlm)),
    ].join("\n");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.openrouterApiKey}`,
    };
    if (config.openrouterHttpReferer) headers["HTTP-Referer"] = config.openrouterHttpReferer;
    if (config.openrouterAppTitle) headers["X-OpenRouter-Title"] = config.openrouterAppTitle;

    const response = await fetchJson<OpenRouterChatResponse>("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: {
        model: config.openrouterModel,
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: input,
          },
        ],
        max_completion_tokens: config.openrouterMaxTokens,
      },
      timeoutMs: 600_000,
    });

    const markdown = extractOutputText(response).trim();
    if (!markdown) throw new Error("OpenRouter response did not contain text output.");
    return { markdown, usedFallback: false };
  } catch (error) {
    const reason = summarizeError(error);
    return {
      markdown: formatFallbackReport(date, items, sourceResults, reason),
      usedFallback: true,
    };
  }
}

function extractOutputText(response: OpenRouterChatResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("\n");
  }
  return "";
}
