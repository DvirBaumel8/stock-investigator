import styles from './AutocompleteDropdown.module.css';
import type { TickerSuggestion } from '../types';

interface AutocompleteDropdownProps {
  suggestions: TickerSuggestion[];
  activeIndex: number;
  loading: boolean;
  onSelect: (symbol: string) => void;
  onHover: (index: number) => void;
}

export function AutocompleteDropdown({ suggestions, activeIndex, loading, onSelect, onHover }: AutocompleteDropdownProps) {
  if (loading) {
    return (
      <div className={styles.dropdown}>
        <div className={styles.loading}>Searching…</div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className={styles.dropdown}>
      {suggestions.map((s, i) => (
        <div
          key={s.symbol}
          className={`${styles.item} ${i === activeIndex ? styles.active : ''}`}
          onMouseDown={() => onSelect(s.symbol)}
          onMouseEnter={() => onHover(i)}
        >
          <span className={styles.symbol}>{s.symbol}</span>
          <span className={styles.dash}>–</span>
          <span className={styles.name}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}
