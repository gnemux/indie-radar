import type { AppConfig, LinearIssueRef } from "../types.js";
import { fetchJson, summarizeError } from "../utils/http.js";

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type IssueNode = {
  id: string;
  identifier: string;
  title: string;
  url?: string;
  project?: { id: string; name: string } | null;
  parent?: { id: string; identifier: string } | null;
};

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

export async function publishToLinear(
  config: AppConfig,
  title: string,
  description: string,
): Promise<{ action: "created" | "updated" | "skipped"; issue?: LinearIssueRef; warning?: string }> {
  if (config.dryRun || config.skipLinear) {
    return { action: "skipped", warning: "DRY_RUN=true or SKIP_LINEAR=true" };
  }

  const existing = await findExistingIssue(config, title);
  if (existing) {
    if (config.linearOnDuplicate === "skip") {
      return { action: "skipped", issue: existing, warning: "Issue with same title already exists." };
    }

    const updated = await updateIssue(config, existing.id, description);
    return { action: "updated", issue: updated };
  }

  const created = await createIssue(config, title, description);
  return { action: "created", issue: created };
}

async function findExistingIssue(config: AppConfig, title: string): Promise<LinearIssueRef | undefined> {
  if (!config.linearApiKey || !config.linearTeamId) return undefined;

  const query = `
    query FindDailyIssue($teamId: ID!, $title: String!) {
      issues(first: 10, filter: { team: { id: { eq: $teamId } }, title: { eq: $title } }) {
        nodes {
          id
          identifier
          title
          url
          project {
            id
            name
          }
          parent {
            id
            identifier
          }
        }
      }
    }
  `;

  try {
    const response = await linearGraphql<{ issues: { nodes: IssueNode[] } }>(config, query, {
      teamId: config.linearTeamId,
      title,
    });
    const nodes = response.issues.nodes;
    const match = nodes.find((node) => {
      if (config.linearProjectId && node.project?.id !== config.linearProjectId) return false;
      if (config.linearParentIssueId && node.parent?.id !== config.linearParentIssueId) return false;
      return true;
    });
    return match ? toIssueRef(match) : undefined;
  } catch (error) {
    console.warn(`Linear duplicate check failed, will continue with create attempt: ${summarizeError(error)}`);
    return undefined;
  }
}

async function createIssue(config: AppConfig, title: string, description: string): Promise<LinearIssueRef> {
  const mutation = `
    mutation CreateDailyIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const input = buildIssueCreateInput(config, title, description);

  const response = await linearGraphql<{ issueCreate: { success: boolean; issue?: IssueNode } }>(config, mutation, { input });
  if (!response.issueCreate.success || !response.issueCreate.issue) {
    throw new Error("Linear issueCreate returned success=false.");
  }
  return toIssueRef(response.issueCreate.issue);
}

export function buildIssueCreateInput(config: AppConfig, title: string, description: string): Record<string, unknown> {
  const input: Record<string, unknown> = {
    teamId: config.linearTeamId,
    title,
    description,
  };
  if (config.linearProjectId) input.projectId = config.linearProjectId;
  if (config.linearParentIssueId) input.parentId = config.linearParentIssueId;
  if (config.linearStateId) input.stateId = config.linearStateId;
  if (config.linearLabelIds.length) input.labelIds = config.linearLabelIds;
  return input;
}

async function updateIssue(config: AppConfig, id: string, description: string): Promise<LinearIssueRef> {
  const mutation = `
    mutation UpdateDailyIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const response = await linearGraphql<{ issueUpdate: { success: boolean; issue?: IssueNode } }>(config, mutation, {
    id,
    input: { description },
  });
  if (!response.issueUpdate.success || !response.issueUpdate.issue) {
    throw new Error("Linear issueUpdate returned success=false.");
  }
  return toIssueRef(response.issueUpdate.issue);
}

async function linearGraphql<T>(config: AppConfig, query: string, variables: Record<string, unknown>): Promise<T> {
  if (!config.linearApiKey) throw new Error("Missing LINEAR_API_KEY.");

  const response = await fetchJson<GraphQlResponse<T>>(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: config.linearApiKey,
    },
    body: { query, variables },
    timeoutMs: 30_000,
  });

  if (response.errors?.length) {
    throw new Error(response.errors.map((error) => error.message).join("; "));
  }
  if (!response.data) throw new Error("Linear response missing data.");
  return response.data;
}

function toIssueRef(issue: IssueNode): LinearIssueRef {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
  };
}
