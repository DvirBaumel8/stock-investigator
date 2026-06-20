import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAnalysisStream } from "./useAnalysisStream";

// ---------- EventSource mock ----------
class MockEventSource {
  static instance: MockEventSource;
  url: string;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, EventListenerOrEventListenerObject> = {};
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instance = this;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners[type] = listener;
  }

  // test helpers
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
  emitNamed(type: string) {
    const listener = this.listeners[type];
    if (typeof listener === "function") listener(new Event(type));
    else if (listener)
      (listener as EventListenerObject).handleEvent(new Event(type));
  }
  triggerError() {
    this.onerror?.();
  }
}

// ---------- fetch mock ----------
const ANALYSIS_RESPONSE = {
  id: "abc",
  ticker: "AAPL",
  status: "pending",
  cached: false,
  createdAt: "2026-01-01",
};

beforeEach(() => {
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ANALYSIS_RESPONSE,
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("useAnalysisStream", () => {
  it("starts with idle state", () => {
    const { result } = renderHook(() => useAnalysisStream());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.agentResults).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });

  it("sets isLoading while waiting for analysis to start", async () => {
    const { result } = renderHook(() => useAnalysisStream());

    act(() => {
      result.current.startAnalysis("AAPL");
    });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.analysisInfo).not.toBeNull());
  });

  it("populates analysisInfo after POST succeeds", async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });

    await waitFor(() =>
      expect(result.current.analysisInfo?.ticker).toBe("AAPL"),
    );
    expect(result.current.analysisInfo?.id).toBe("abc");
  });

  it("appends agent results from SSE messages", async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(MockEventSource.instance).toBeDefined());

    const agentEvent = {
      id: "1",
      agentName: "technical",
      status: "completed",
      output: {},
      error: null,
      durationMs: 500,
      createdAt: "2026-01-01",
    };
    act(() => MockEventSource.instance.emit(agentEvent));

    expect(result.current.agentResults).toHaveLength(1);
    expect(result.current.agentResults[0].agentName).toBe("technical");
  });

  it("updates an existing agent result instead of appending duplicate", async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(MockEventSource.instance).toBeDefined());

    const pending = {
      id: "1",
      agentName: "technical",
      status: "pending",
      output: null,
      error: null,
      durationMs: null,
      createdAt: "2026-01-01",
    };
    const completed = {
      ...pending,
      status: "completed",
      output: { rsi14: 55 },
      durationMs: 800,
    };

    act(() => MockEventSource.instance.emit(pending));
    act(() => MockEventSource.instance.emit(completed));

    expect(result.current.agentResults).toHaveLength(1);
    expect(result.current.agentResults[0].status).toBe("completed");
  });

  it('sets isComplete and stops loading on "complete" SSE event', async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(MockEventSource.instance).toBeDefined());

    act(() => MockEventSource.instance.emitNamed("complete"));

    expect(result.current.isComplete).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(MockEventSource.instance.close).toHaveBeenCalled();
  });

  it("sets isComplete and stops loading on SSE error", async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(MockEventSource.instance).toBeDefined());

    act(() => MockEventSource.instance.triggerError());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error when the POST fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    const { result } = renderHook(() => useAnalysisStream());

    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toMatch(/500/);
  });

  it("reset clears all state", async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      result.current.startAnalysis("AAPL");
    });
    await waitFor(() => expect(result.current.analysisInfo).not.toBeNull());

    act(() => result.current.reset());

    expect(result.current.analysisInfo).toBeNull();
    expect(result.current.agentResults).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });
});
