# Prettier Design

**Date:** 2026-06-15
**Status:** Approved

## Overview

Add Prettier for code formatting to both the frontend and backend. ESLint already handles correctness; Prettier handles style. The two are integrated via `eslint-config-prettier` which disables any ESLint formatting rules that would conflict with Prettier.

## Prettier Config

Single `.prettierrc` at the repo root covers both projects:

```json
{
  "singleQuote": false,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

These are Prettier's defaults made explicit. Both frontend and backend use the same formatting style.

Single `.prettierignore` at the repo root:
```
dist
node_modules
coverage
```

## ESLint Integration

Add `eslint-config-prettier` as the last entry in `extends` in both ESLint configs. This disables ESLint formatting rules that would conflict with Prettier, so the two tools don't fight each other.

- `frontend/eslint.config.js` — add `prettier` config at the end of `extends`
- `backend/eslint.config.mjs` — add `prettier` config at the end of `extends`

**New devDependencies** (both `frontend/package.json` and `backend/package.json`):
- `prettier`
- `eslint-config-prettier`

## Scripts

Add to both subprojects:
- `"format"`: `prettier --write .`
- `"format:check"`: `prettier --check .`

Root `package.json` additions:
- `"fe:format"`: `npm run format --prefix frontend`
- `"fe:format:check"`: `npm run format:check --prefix frontend`
- `"be:format"`: `npm run format --prefix backend`
- `"be:format:check"`: `npm run format:check --prefix backend`
- `"format"`: `npm run fe:format && npm run be:format`
- `"format:check"`: `npm run fe:format:check && npm run be:format:check`

## VS Code Save-on-Format

Update `.vscode/settings.json` to add Prettier as the default formatter and enable format-on-save:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.workingDirectories": [
    "./frontend",
    "./backend"
  ]
}
```

On Cmd+S: Prettier formats first, then ESLint autofixes.

**Prerequisite:** VS Code extension `esbenp.prettier-vscode` must be installed manually.

## What Is Not Changing

- ESLint configs beyond adding `eslint-config-prettier` — no rule changes
- No per-project `.prettierrc` files — one root config covers both
- No `eslint-plugin-prettier` — Prettier and ESLint remain separate tools
