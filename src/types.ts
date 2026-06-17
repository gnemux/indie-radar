export type SourceName = "hackernews" | "github" | "producthunt" | "mock";

export type RadarItem = {
  id: string;
  title: string;
  url: string;
  source: SourceName;
  description?: string | undefined;
  scoreRaw?: number | undefined;
  commentsCount?: number | undefined;
  tags: string[];
  publishedAt?: string | undefined;
  metadata?: Record<string, string | number | boolean | null> | undefined;
};

export type SourceFetchResult = {
  source: SourceName;
  ok: boolean;
  items: RadarItem[];
  warnings: string[];
  error?: string;
};

export type LinearDuplicatePolicy = "skip" | "update";

export type AppConfig = {
  openrouterApiKey: string | undefined;
  openrouterModel: string;
  openrouterMaxTokens: number;
  openrouterHttpReferer: string | undefined;
  openrouterAppTitle: string;
  linearApiKey: string | undefined;
  linearTeamId: string | undefined;
  linearProjectId: string | undefined;
  linearParentIssueId: string | undefined;
  linearStateId: string | undefined;
  linearLabelIds: string[];
  linearOnDuplicate: LinearDuplicatePolicy;
  allowProjectlessLinear: boolean;
  githubToken: string | undefined;
  productHuntToken: string | undefined;
  timezone: string;
  runDate: string | undefined;
  dryRun: boolean;
  skipLlm: boolean;
  skipLinear: boolean;
  mockSources: boolean;
  promptPath: string;
  maxCandidatesForLlm: number;
};

export type LinearIssueRef = {
  id: string;
  identifier: string;
  title: string;
  url?: string | undefined;
};
