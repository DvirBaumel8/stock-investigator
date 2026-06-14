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
    <div style={{ marginBottom: 16, padding: '10px 14px', background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 14, color: '#e6edf3' }}>
      <strong>{ticker}</strong>
      {cached && cachedAt && (
        <span style={{ marginLeft: 10, fontSize: 12, color: '#7d8590', background: '#21262d', padding: '2px 8px', borderRadius: 10 }}>
          Cached &middot; {new Date(cachedAt).toLocaleString()}
        </span>
      )}
      {!isComplete && (
        <span style={{ marginLeft: 10, color: '#7d8590' }}>
          {completedAgents}/{totalAgents} agents complete
        </span>
      )}
      {isComplete && (
        <span style={{ marginLeft: 10, color: '#3fb950' }}>✓ Analysis complete</span>
      )}
    </div>
  );
}
