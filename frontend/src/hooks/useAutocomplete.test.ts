import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutocomplete } from './useAutocomplete';

const MOCK_DB = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'AMD',  name: 'Advanced Micro Devices' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
];

function makeFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    const q = new URL(url).searchParams.get('search') ?? '';
    const results = MOCK_DB.filter(
      t => t.symbol.startsWith(q) || t.name.toUpperCase().includes(q),
    ).slice(0, 6);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(results) });
  });
}

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', makeFetchMock());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns empty suggestions and not loading for empty query', () => {
    const { result } = renderHook(() => useAutocomplete(''));
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('filters by symbol prefix', async () => {
    const { result } = renderHook(() => useAutocomplete('AA'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.suggestions.length).toBeGreaterThan(0);
    expect(result.current.suggestions.every(s => s.symbol.startsWith('AA'))).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('filters by name substring (case-insensitive)', async () => {
    const { result } = renderHook(() => useAutocomplete('apple'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.suggestions.some(s => s.symbol === 'AAPL')).toBe(true);
  });

  it('caps results at 6', async () => {
    const { result } = renderHook(() => useAutocomplete('A'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.suggestions.length).toBeLessThanOrEqual(6);
  });

  it('returns empty suggestions for unrecognised query', async () => {
    const { result } = renderHook(() => useAutocomplete('XYZXYZ'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.suggestions).toEqual([]);
  });

  it('isKnownTicker is true after suggestions load for exact symbol match', async () => {
    const { result } = renderHook(() => useAutocomplete('AAPL'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.isKnownTicker).toBe(true);
  });

  it('isKnownTicker is false for unknown input', async () => {
    const { result } = renderHook(() => useAutocomplete('שדגדשג'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.isKnownTicker).toBe(false);
  });

  it('isKnownTicker is false for partial input', async () => {
    const { result } = renderHook(() => useAutocomplete('AAP'));
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.isKnownTicker).toBe(false);
  });

  it('does not show suggestions before the debounce fires', () => {
    const { result } = renderHook(() => useAutocomplete('AAPL'));
    // do NOT advance timers
    expect(result.current.suggestions).toEqual([]);
  });

  it('clears suggestions when query goes back to empty', async () => {
    const { result, rerender } = renderHook(({ q }) => useAutocomplete(q), {
      initialProps: { q: 'AAPL' },
    });
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.suggestions.length).toBeGreaterThan(0);

    rerender({ q: '' });
    expect(result.current.suggestions).toEqual([]);
  });

  it('sends the correct search param to the backend', async () => {
    renderHook(() => useAutocomplete('tsla'));
    await act(async () => { vi.advanceTimersByTime(200); });
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('search=TSLA');
    expect(calledUrl).toContain('limit=6');
  });

  it('aborts in-flight request when query changes', async () => {
    const { rerender } = renderHook(({ q }) => useAutocomplete(q), {
      initialProps: { q: 'AA' },
    });
    // Change query before debounce fires — previous effect cleans up
    rerender({ q: 'AAP' });
    await act(async () => { vi.advanceTimersByTime(200); });
    // fetch should only have been called once (for 'AAP', not 'AA')
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
