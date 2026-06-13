import { useState, type FormEvent } from 'react';

interface TickerInputProps {
  onSubmit: (ticker: string) => void;
  isLoading: boolean;
}

export function TickerInput({ onSubmit, isLoading }: TickerInputProps) {
  const [ticker, setTicker] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t) onSubmit(t);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="e.g. AAPL"
        maxLength={10}
        disabled={isLoading}
        style={{ padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', width: 140 }}
      />
      <button
        type="submit"
        disabled={isLoading || !ticker.trim()}
        style={{ padding: '8px 16px', fontSize: 16, borderRadius: 6, cursor: 'pointer', background: '#1a6cf6', color: '#fff', border: 'none' }}
      >
        {isLoading ? 'Analyzing…' : 'Analyze'}
      </button>
    </form>
  );
}
