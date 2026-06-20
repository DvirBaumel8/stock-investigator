import type { AgentResultEvent } from "../types";

const AGENT_LABELS: Record<string, string> = {
  technical: "Technical Analysis",
  news_sentiment: "News & Sentiment",
};

interface AgentResultCardProps {
  result: AgentResultEvent;
}

export function AgentResultCard({ result }: AgentResultCardProps) {
  const label = AGENT_LABELS[result.agentName] ?? result.agentName;

  const cardStyle: React.CSSProperties = {
    border: "1px solid #30363d",
    borderRadius: 12,
    padding: 16,
    background: "#161b22",
    color: "#e6edf3",
    minWidth: 300,
    maxWidth: 520,
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <StatusBadge status={result.status} />
      </div>

      {result.status === "pending" && (
        <div style={{ color: "#7d8590", fontSize: 13 }}>Running…</div>
      )}

      {result.status === "failed" && (
        <div style={{ color: "#f85149", fontSize: 13 }}>
          Error: {result.error}
        </div>
      )}

      {result.status === "completed" && result.output && (
        <OutputRenderer agentName={result.agentName} output={result.output} />
      )}

      {result.durationMs != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#7d8590" }}>
          Completed in {(result.durationMs / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentResultEvent["status"] }) {
  const colors: Record<string, string> = {
    pending: "#d29922",
    completed: "#3fb950",
    failed: "#f85149",
  };
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 12,
        background: colors[status],
        color: "#fff",
      }}
    >
      {status}
    </span>
  );
}

function OutputRenderer({
  agentName,
  output,
}: {
  agentName: string;
  output: Record<string, unknown>;
}) {
  if (agentName === "technical") return <TechnicalOutput data={output} />;
  if (agentName === "news_sentiment") return <NewsOutput data={output} />;
  return (
    <pre style={{ fontSize: 12, overflow: "auto", color: "#e6edf3" }}>
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function TechnicalOutput({ data }: { data: Record<string, unknown> }) {
  const signals = data.signals as string[] | undefined;
  return (
    <div style={{ fontSize: 13 }}>
      <div>
        <b>Price:</b> ${(data.currentPrice as number)?.toFixed(2)}
      </div>
      <div>
        <b>RSI(14):</b> {data.rsi14 as number}
      </div>
      {(data.ma50 as number | undefined) && (
        <div>
          <b>MA50:</b> ${(data.ma50 as number).toFixed(2)}
        </div>
      )}
      {(data.ma200 as number | undefined) && (
        <div>
          <b>MA200:</b> ${(data.ma200 as number).toFixed(2)}
        </div>
      )}
      {signals && signals.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 16 }}>
          {signals.map((s, i) => (
            <li key={i} style={{ marginBottom: 2 }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsOutput({ data }: { data: Record<string, unknown> }) {
  const headlines = data.topHeadlines as
    | Array<{ title: string; sentiment: string }>
    | undefined;
  const sentimentColor =
    data.overallSentiment === "bullish"
      ? "#3fb950"
      : data.overallSentiment === "bearish"
        ? "#f85149"
        : "#7d8590";
  return (
    <div style={{ fontSize: 13 }}>
      <div>
        <b>Sentiment:</b>{" "}
        <span style={{ color: sentimentColor, fontWeight: 600 }}>
          {data.overallSentiment as string}
        </span>{" "}
        ({(data.sentimentScore as number) >= 0 ? "+" : ""}
        {(data.sentimentScore as number)?.toFixed(2)})
      </div>
      <div style={{ marginTop: 6, color: "#555" }}>
        {data.summary as string}
      </div>
      <div style={{ marginTop: 6, color: "#7d8590" }}>
        {data.summary as string}
      </div>
      {headlines && (
        <div style={{ marginTop: 8 }}>
          <b>Recent headlines:</b>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            {headlines.slice(0, 3).map((h, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {h.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
