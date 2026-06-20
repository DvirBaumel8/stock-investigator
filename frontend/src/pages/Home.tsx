import { useState } from "react";
import { useAnalysisStream } from "../hooks/useAnalysisStream";
import { Sidebar } from "../components/Sidebar";
import { SearchInput } from "../components/SearchInput";
import { PopularCards } from "../components/PopularCards";
import { AgentResultCard } from "../components/AgentResultCard";
import { AnalysisProgress } from "../components/AnalysisProgress";
import styles from "./Home.module.css";

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");

  const {
    agentResults,
    analysisInfo,
    isLoading,
    isComplete,
    error,
    startAnalysis,
    reset,
  } = useAnalysisStream();

  const TOTAL_AGENTS = 2;
  const showResults = agentResults.length > 0 || isLoading || !!error;
  const completedAgents = agentResults.filter(
    (r) => r.status !== "pending",
  ).length;

  function handleSubmit(ticker: string) {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setQuery(t);
    startAnalysis(t);
  }

  function handleReset() {
    setQuery("");
    reset();
  }

  return (
    <div className={`${styles.layout} ${sidebarOpen ? "" : styles.collapsed}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        history={[]}
        onSelectTicker={handleSubmit}
        onNewResearch={handleReset}
      />

      <main className={`${styles.main} ${showResults ? "" : styles.centered}`}>
        <div className={styles.hero}>
          <h1 className={styles.heading}>
            What are we researching today?
          </h1>
          <SearchInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {showResults ? (
          <div className={styles.results}>
            {error && <div className={styles.error}>Error: {error}</div>}
            {analysisInfo && (
              <AnalysisProgress
                ticker={analysisInfo.ticker}
                cached={analysisInfo.cached}
                cachedAt={
                  analysisInfo.cached ? analysisInfo.createdAt : undefined
                }
                isComplete={isComplete}
                totalAgents={TOTAL_AGENTS}
                completedAgents={completedAgents}
              />
            )}
            <div className={styles.cards}>
              {agentResults.map((result) => (
                <AgentResultCard key={result.id} result={result} />
              ))}
            </div>
            <button className={styles.resetBtn} onClick={handleReset}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              New Research
            </button>
          </div>
        ) : (
          <PopularCards onSelect={handleSubmit} />
        )}
      </main>
    </div>
  );
}
