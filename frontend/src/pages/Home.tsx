import { useAnalysisStream } from "../hooks/useAnalysisStream";
import { TickerInput } from "../components/TickerInput";
import { AgentResultCard } from "../components/AgentResultCard";
import { AnalysisProgress } from "../components/AnalysisProgress";

export function Home() {
  const {
    agentResults,
    analysisInfo,
    isLoading,
    isComplete,
    error,
    startAnalysis,
    reset,
  } = useAnalysisStream();

  const completedAgents = agentResults.filter(
    (r) => r.status !== "pending",
  ).length;

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: "0 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Stock Investigator</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Multi-agent stock analysis powered by AI
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <TickerInput onSubmit={startAnalysis} isLoading={isLoading} />
        {(agentResults.length > 0 || error) && (
          <button
            onClick={reset}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #ccc",
              cursor: "pointer",
              background: "#fff",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            color: "#c0392b",
            background: "#fdf0ee",
            padding: "10px 14px",
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          Error: {error}
        </div>
      )}

      {analysisInfo && (
        <AnalysisProgress
          ticker={analysisInfo.ticker}
          cached={analysisInfo.cached}
          cachedAt={analysisInfo.cached ? analysisInfo.createdAt : undefined}
          isComplete={isComplete}
          totalAgents={2}
          completedAgents={completedAgents}
        />
      )}

      {agentResults.length > 0 && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {agentResults.map((result) => (
            <AgentResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
