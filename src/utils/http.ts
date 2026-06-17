export type FetchJsonOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: controller.signal,
  };
  if (options.body) requestInit.body = JSON.stringify(options.body);

  try {
    const response = await fetch(url, requestInit);

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const message = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${message.slice(0, 600)}`);
    }

    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function summarizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
