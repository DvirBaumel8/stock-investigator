export type AgentResultStatus = "pending" | "completed" | "failed";

export interface TickerSuggestion {
  symbol: string;
  name: string;
  assetType?: string;
}

export interface HistoryEntry {
  symbol: string;
  timestamp: string;
}

export interface AgentResultEvent {
  id: string;
  agentName: string;
  status: AgentResultStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AnalysisResponse {
  id: string;
  ticker: string;
  status: string;
  cached: boolean;
  createdAt: string;
}
