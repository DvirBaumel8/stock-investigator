# Brainstorming: Landing Page — Command Center Design

## Problem Summary

Replace the current minimal `Home.tsx` with a polished, dark-themed "Command Center" landing page for Stock Investigator. Inspired by the reference screenshot (image provided by user, Jun 14 2026).

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Styling | **CSS Modules** — Vite-native, zero new deps, handles transitions/hover cleanly |
| API endpoints | **Mock client-side** — unblock UI; wire real endpoints later |
| History storage | **Empty / stub** — backend persistence is planned, sidebar shows empty state for now |
| Results display | **In-place overlay** — results appear below the command center on the same page |

---

## UI Breakdown (from reference screenshot)

### Colors / Tokens
```css
--bg:           #0d1117    /* main background — very dark navy */
--surface:      #161b22    /* sidebar, cards, input surface */
--surface-2:    #1c2230    /* autocomplete dropdown, hover states */
--border:       #2a3244    /* subtle borders */
--accent:       #1a6cf6    /* Pro badge, primary blue */
--text:         #e6edf3    /* primary text */
--muted:        #7d8590    /* secondary text, labels */
--green:        #7ee787    /* ticker symbols in popular cards */
--radius-pill:  9999px
--radius-card:  12px
--radius-sm:    6px
```

### Layout
- `display: grid; grid-template-columns: 200px 1fr` (sidebar + main)
- Sidebar collapses to ~48px (icons only) via CSS transition on `grid-template-columns`
- Main area: `display: flex; flex-direction: column; align-items: center; justify-content: center`

### Sidebar
- Header: `"RESEARCH HISTORY"` — small, uppercase, muted text
- Collapse toggle: `<<` / `>>` icon button (top right of sidebar)
- `"New Research"` button — full-width, rounded, slightly lighter than sidebar bg
- History items: `"TSLA – analyzed Sep 14"` — ticker bold white, rest muted
- Bottom: user avatar circle + `"Dvir B."` + `"Status: Active"` (green dot)

### Central Search Input
- Container: pill-shaped (`border-radius: 9999px`), ~600px wide, dark surface bg, 1px border
- Left: magnifying glass SVG icon (muted color)
- Middle: `<input>` — `placeholder="Enter ticker, e.g., TSLA..."`, font ~18px
- Right: `"Pro ▼"` badge (blue button, small dropdown arrow) + mic SVG icon
- Heading above: `"What are we researching today, Dvir?"` — large (~36px), white, bold

### Autocomplete Dropdown
- Appears below the input pill (not attached — slight gap)
- Rounded card (`border-radius: 12px`), surface-2 bg, subtle box-shadow
- Each row: `"AAPL"` (bold white) + `" – Apple Inc."` (muted) + optional `"Pro"` badge on right
- Highlighted row: slightly lighter bg on hover
- Keyboard navigation: ArrowUp/Down to navigate, Enter to select, Escape to close

### Popular Researches
- Section heading: `"Popular Researches"` — white, ~20px
- 3 cards in a row, equal width, rounded corners, surface bg, 1px border
- Card label: `"Quick Research"` — small, muted, uppercase
- Card title: `"$NVDA – 'The AI Kingpin'"` — ticker in green, rest in white

### Decorative
- 4-point star/sparkle icon — bottom right of main area, muted silver

---

## Component Architecture

```
Home.tsx (page — owns all state)
├── Sidebar.tsx + Sidebar.module.css
│   └── HistoryItem.tsx
├── CommandCenter.tsx + CommandCenter.module.css
│   ├── SearchInput.tsx + SearchInput.module.css
│   │   └── AutocompleteDropdown.tsx
│   └── PopularCards.tsx
└── ResultsPane.tsx  (existing AgentResultCard / AnalysisProgress — shown in-place)
```

---

## State Shape in `Home.tsx`

```ts
// sidebar
const [sidebarOpen, setSidebarOpen] = useState(true);

// search
const [query, setQuery] = useState('');
const [showResults, setShowResults] = useState(false);

// autocomplete
const { suggestions, loading: acLoading } = useAutocomplete(query);

// history — stubbed empty for now (BE endpoint planned)
const history: HistoryEntry[] = [];

// existing analysis stream
const { agentResults, analysisInfo, isLoading, isComplete, error, startAnalysis, reset } = useAnalysisStream();
```

---

## Hooks

### `useAutocomplete(query: string)`

```ts
// 200ms debounce + AbortController so inflight requests cancel on fast typing
export function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 1) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Mock: filter static list by prefix
        const results = MOCK_TICKERS.filter(t =>
          t.symbol.startsWith(query.toUpperCase())
        );
        setSuggestions(results);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  return { suggestions, loading };
}
```

### Mock data

```ts
const MOCK_TICKERS: TickerSuggestion[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'AMD',  name: 'Advanced Micro Devices' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
];

const POPULAR: PopularEntry[] = [
  { symbol: 'NVDA', label: "'The AI Kingpin'" },
  { symbol: 'TSLA', label: "'Momentum Check'" },
  { symbol: 'AAPL', label: "'The Safe Bet?'" },
];
```

---

## CSS Modules File Map

```
src/
  pages/
    Home.tsx
    Home.module.css
  components/
    Sidebar/
      Sidebar.tsx
      Sidebar.module.css
    SearchInput/
      SearchInput.tsx
      SearchInput.module.css
      AutocompleteDropdown.tsx
      AutocompleteDropdown.module.css
    PopularCards/
      PopularCards.tsx
      PopularCards.module.css
```

---

## Recommended Approach

Build in this order:
1. `Home.module.css` — grid layout, dark bg
2. `Sidebar` — static, collapsible, empty history state
3. `SearchInput` + `useAutocomplete` + `AutocompleteDropdown`
4. `PopularCards`
5. Wire `startAnalysis` and drop existing `ResultsPane` into the in-place overlay below

Each step is independently reviewable and shippable.
