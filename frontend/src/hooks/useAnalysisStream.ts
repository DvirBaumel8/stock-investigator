import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentResultEvent, AnalysisResponse } from '../types';

const API_BASE = 'http://localhost:3001';

interface UseAnalysisStreamReturn {
  analysisId: string | null;
  analysisInfo: AnalysisResponse | null;
  agentResults: AgentResultEvent[];
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  startAnalysis: (ticker: string) => void;
  reset: () => void;
}

export function useAnalysisStream(): UseAnalysisStreamReturn {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<AnalysisResponse | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResultEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    setAnalysisId(null);
    setAnalysisInfo(null);
    setAgentResults([]);
    setIsLoading(false);
    setIsComplete(false);
    setError(null);
  }, []);

  const startAnalysis = useCallback(async (ticker: string) => {
    reset();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/analysis/${ticker.toUpperCase().trim()}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data: AnalysisResponse = await response.json();

      setAnalysisId(data.id);
      setAnalysisInfo(data);

      const es = new EventSource(`${API_BASE}/analysis/${data.id}/stream`);
      esRef.current = es;

      es.onmessage = (event) => {
        const result: AgentResultEvent = JSON.parse(event.data);
        setAgentResults((prev) => {
          const idx = prev.findIndex((r) => r.id === result.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = result;
            return updated;
          }
          return [...prev, result];
        });
      };

      es.addEventListener('complete', () => {
        setIsComplete(true);
        setIsLoading(false);
        es.close();
      });

      es.onerror = () => {
        setIsLoading(false);
        setIsComplete(true);
        es.close();
      };
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return { analysisId, analysisInfo, agentResults, isLoading, isComplete, error, startAnalysis, reset };
}
