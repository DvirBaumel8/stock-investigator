import { useState, useEffect } from "react";
import type { TickerSuggestion } from "../types";

const API_BASE = "http://localhost:3001";

export function useAutocomplete(query: string) {
  const q = query.trim().toUpperCase();
  // Store fetched results tagged with the query they belong to, so we can
  // derive what to show during render instead of clearing state in the effect.
  const [result, setResult] = useState<{
    query: string;
    data: TickerSuggestion[];
  }>({ query: "", data: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 1) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/tickers?search=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TickerSuggestion[] = await res.json();
        setResult({ query: q, data });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResult({ query: q, data: [] });
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // Derived during render: show results only when they match the current query.
  // Empty or changed queries fall back to [] without a synchronous setState.
  const suggestions = q.length >= 1 && result.query === q ? result.data : [];
  const isKnownTicker = suggestions.some((s) => s.symbol === q);

  return { suggestions, loading, isKnownTicker };
}
