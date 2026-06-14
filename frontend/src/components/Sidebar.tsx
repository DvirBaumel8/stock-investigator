import styles from './Sidebar.module.css';
import type { HistoryEntry } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: HistoryEntry[];
  onSelectTicker: (symbol: string) => void;
  onNewResearch: () => void;
}

export function Sidebar({ isOpen, onToggle, history, onSelectTicker, onNewResearch }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header} style={{ justifyContent: isOpen ? 'space-between' : 'center' }}>
        {isOpen && <span className={styles.headerTitle}>Research History</span>}
        <button className={styles.toggleBtn} onClick={onToggle} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {isOpen ? '«' : '»'}
        </button>
      </div>

      {isOpen ? (
        <>
          <button className={styles.newResearchBtn} onClick={onNewResearch}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            New Research
          </button>
          <div className={styles.historyList}>
            {history.map((entry, i) => (
              <div key={i} className={styles.historyItem} onClick={() => onSelectTicker(entry.symbol)}>
                <span className={styles.historySymbol}>{entry.symbol}</span>
                <span className={styles.historyDate}>– {entry.timestamp}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.collapsedActions}>
          <button className={styles.iconBtn} aria-label="New Research" data-tooltip="New Research" onClick={onNewResearch}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>
      )}

    </aside>
  );
}
