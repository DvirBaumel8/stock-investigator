import { useState, useEffect } from 'react';
import type { TickerSuggestion } from '../types';

const API_BASE = 'http://localhost:3001';

export function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/tickers?search=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TickerSuggestion[] = await res.json();
        setSuggestions(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const isKnownTicker = suggestions.some(
    s => s.symbol === query.trim().toUpperCase(),
  );

  return { suggestions, loading, isKnownTicker };
}
