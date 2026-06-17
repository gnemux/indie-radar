import { existsSync, readFileSync } from "node:fs";

export function loadDotEnv(path = ".env"): void {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = unquote(rawValue);
  }
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = getOptionalEnv(name);
  if (!value) return fallback;

  if (["1", "true", "yes", "y", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "n", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`Invalid boolean value for ${name}. Use true or false.`);
}

export function getIntegerEnv(name: string, fallback: number): number {
  const value = getOptionalEnv(name);
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid integer value for ${name}.`);
  }
  return parsed;
}

export function getCsvEnv(name: string): string[] {
  return (getOptionalEnv(name) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
