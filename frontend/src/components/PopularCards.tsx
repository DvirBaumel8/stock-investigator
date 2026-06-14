import styles from './PopularCards.module.css';

const POPULAR = [
  { symbol: 'NVDA', label: "'The AI Kingpin'" },
  { symbol: 'TSLA', label: "'Momentum Check'" },
  { symbol: 'AAPL', label: "'The Safe Bet?'" },
];

interface PopularCardsProps {
  onSelect: (symbol: string) => void;
}

export function PopularCards({ onSelect }: PopularCardsProps) {
  return (
    <div className={styles.section}>
      <div className={styles.heading}>Popular Researches</div>
      <div className={styles.grid}>
        {POPULAR.map(({ symbol, label }) => (
          <button key={symbol} className={styles.card} onClick={() => onSelect(symbol)}>
            <div className={styles.label}>Quick Research</div>
            <div className={styles.title}>
              <span className={styles.ticker}>${symbol}</span>{' – '}{label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
