import { supabase } from "./supabase";

// Types
export interface AISession {
  id: number;
  created_at: string;
  ai_tool: string;
  task_type: string;
  prompt_content: string;
  tokens_used: number;
  author_id: string;
}

export interface SkillItem {
  id: number;
  created_at: string;
  title: string;
  prompt_content: string;
  category: string;
  author_id: string;
}

export interface TeamMemberStats {
  author_id: string;
  total_tokens: number;
  usage_count: number;
}

export interface ToolStats {
  ai_tool: string;
  total_tokens: number;
  percentage: number;
}

// Fetch all AI sessions
export async function fetchAISessions() {
  const { data, error } = await supabase.from("ai_sessions").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching AI sessions:", error);
    return [];
  }
  return data as AISession[];
}

// Get total tokens used
export async function getTotalTokensUsed() {
  const { data, error } = await supabase.from("ai_sessions").select("tokens_used");

  if (error) {
    console.error("Error fetching total tokens:", error);
    return 0;
  }

  return data.reduce((sum, row) => sum + (row.tokens_used || 0), 0);
}

// Calculate monthly cost (tokens * 0.015 / 1000)
export async function getMonthlyCost() {
  const totalTokens = await getTotalTokensUsed();
  const costPerThousandTokens = 0.015;
  return (totalTokens / 1000) * costPerThousandTokens;
}

// Get AI tool distribution
export async function getToolDistribution(): Promise<ToolStats[]> {
  const { data, error } = await supabase.from("ai_sessions").select("ai_tool, tokens_used");

  if (error) {
    console.error("Error fetching tool distribution:", error);
    return [];
  }

  // Group by ai_tool and sum tokens
  const toolMap = new Map<string, number>();
  data.forEach((row) => {
    const tool = row.ai_tool || "Unknown";
    const current = toolMap.get(tool) || 0;
    toolMap.set(tool, current + (row.tokens_used || 0));
  });

  const totalTokens = Array.from(toolMap.values()).reduce((a, b) => a + b, 0);

  return Array.from(toolMap.entries()).map(([tool, tokens]) => ({
    ai_tool: tool,
    total_tokens: tokens,
    percentage: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
  }));
}

// Get team member stats (grouped by author_id)
export async function getTeamMemberStats(): Promise<TeamMemberStats[]> {
  const { data, error } = await supabase.from("ai_sessions").select("author_id, tokens_used");

  if (error) {
    console.error("Error fetching team stats:", error);
    return [];
  }

  // Group by author_id and sum tokens
  const authorMap = new Map<string, { tokens: number; count: number }>();
  data.forEach((row) => {
    const authorId = row.author_id || "Unknown";
    const current = authorMap.get(authorId) || { tokens: 0, count: 0 };
    authorMap.set(authorId, {
      tokens: current.tokens + (row.tokens_used || 0),
      count: current.count + 1,
    });
  });

  return Array.from(authorMap.entries()).map(([authorId, stats]) => ({
    author_id: authorId,
    total_tokens: stats.tokens,
    usage_count: stats.count,
  }));
}

// Get unique team members count (adoption rate)
export async function getTeamAdoptionRate() {
  const { data, error, count } = await supabase.from("ai_sessions").select("author_id", { count: "exact" }).neq("author_id", null);

  if (error) {
    console.error("Error fetching adoption rate:", error);
    return 0;
  }

  // Get distinct authors
  const authors = new Set(data?.map((row) => row.author_id) || []);
  return authors.size;
}

// Fetch all skills from skill_library
export async function fetchSkillLibrary() {
  const { data, error } = await supabase.from("skill_library").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching skill library:", error);
    return [];
  }
  return data as SkillItem[];
}

// Format author names (mock mapping - can be enhanced with actual user table)
export const authorNameMap: Record<string, string> = {
  "user-001": "Linh",
  "user-002": "Minh",
  "user-003": "Huy",
  "user-004": "Trang",
  "user-005": "Nam",
  "user-006": "Phương",
  "user-007": "Đức",
};

export function getAuthorName(authorId: string): string {
  return authorNameMap[authorId] || authorId.substring(0, 2).toUpperCase();
}

// Get author color for avatar
export const authorColorMap: Record<string, string> = {
  "user-001": "#818cf8",
  "user-002": "#f87171",
  "user-003": "#34d399",
  "user-004": "#fbbf24",
  "user-005": "#60a5fa",
  "user-006": "#a78bfa",
  "user-007": "#fb923c",
};

export function getAuthorColor(authorId: string): string {
  return authorColorMap[authorId] || "#94a3b8";
}

// Get author department (mock mapping)
export const authorDepartmentMap: Record<string, string> = {
  "user-001": "Marketing",
  "user-002": "Sales",
  "user-003": "Dev",
  "user-004": "Ops",
  "user-005": "Sales",
  "user-006": "Marketing",
  "user-007": "Design",
};

export function getAuthorDepartment(authorId: string): string {
  return authorDepartmentMap[authorId] || "Unknown";
}
