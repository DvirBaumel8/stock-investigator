interface AnalysisProgressProps {
  ticker: string;
  cached: boolean;
  cachedAt?: string;
  isComplete: boolean;
  totalAgents: number;
  completedAgents: number;
}

export function AnalysisProgress({
  ticker,
  cached,
  cachedAt,
  isComplete,
  totalAgents,
  completedAgents,
}: AnalysisProgressProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "10px 14px",
        background: "#f8f9fa",
        borderRadius: 6,
        fontSize: 14,
      }}
    >
      <strong>{ticker}</strong>
      {cached && cachedAt && (
        <span
          style={{
            marginLeft: 10,
            fontSize: 12,
            color: "#888",
            background: "#e8e8e8",
            padding: "2px 8px",
            borderRadius: 10,
          }}
        >
          Cached &middot; {new Date(cachedAt).toLocaleString()}
        </span>
      )}
      {!isComplete && (
        <span style={{ marginLeft: 10, color: "#555" }}>
          {completedAgents}/{totalAgents} agents complete
        </span>
      )}
      {isComplete && (
        <span style={{ marginLeft: 10, color: "#27ae60" }}>
          ✓ Analysis complete
        </span>
      )}
    </div>
  );
}
