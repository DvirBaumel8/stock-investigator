# Decision: Landing Page — Command Center

## Decisions

| Area | Choice | Reason |
|------|--------|--------|
| Styling | CSS Modules | Vite-native, zero new deps, enables sidebar CSS transition |
| API | Mock client-side | Unblocks UI work; wire `/api/tickers/autocomplete` in a follow-up |
| History | Empty stub (BE planned) | Sidebar renders but history list is empty for now |
| Results | In-place overlay | Same page; popular cards hide when results appear |

## Color Tokens (from screenshot)

GitHub dark-mode palette:
```
--bg:           #0d1117
--surface:      #161b22
--surface-2:    #21262d
--surface-hover:#1c2128
--border:       #30363d
--accent:       #1f6feb
--text:         #e6edf3
--muted:        #7d8590
--green:        #7ee787
```

## File Plan

### New files
- `src/styles/globals.css`            — reset + CSS vars
- `src/vite-env.d.ts`                 — CSS module types
- `src/pages/Home.module.css`
- `src/components/Sidebar.tsx` + `.module.css`
- `src/components/SearchInput.tsx` + `.module.css`
- `src/components/AutocompleteDropdown.tsx` + `.module.css`
- `src/components/PopularCards.tsx` + `.module.css`
- `src/hooks/useAutocomplete.ts`

### Modified files
- `src/main.tsx`                       — import globals.css
- `src/types.ts`                       — add TickerSuggestion, HistoryEntry
- `src/pages/Home.tsx`                 — full rewrite
- `src/components/AgentResultCard.tsx` — dark theme inline styles
- `src/components/AnalysisProgress.tsx`— dark theme inline styles
