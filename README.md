# DAX Workbench — Mightora

A free open-source static web app to **format, compare and review Power BI DAX expressions and measures**. It runs locally in the browser; no server or semantic model is required.

## Features

- Paste expressions, simple `Name = ...` definitions, `DEFINE MEASURE` blocks and common TMDL measure declarations; import `.dax`, `.txt`, `.tmdl` (text, max 2 MB).
- Conservative whitespace formatting and DAX function casing, without changing quoted table names, strings or bracketed identifiers.
- Compare two inputs with a safe, text-only line diff, optionally ignoring whitespace.
- Name checks, local pasted measure reference matching, candidate dependencies, delimiter checks and optional maintainability guidance.
- Eight copy-ready calculation templates, with explicit model-dependent assumptions.
- Export formatted DAX and a machine-readable static review JSON.
- Live request-domain summary and instructions to audit traffic in browser Developer Tools.
- Fully standalone offline HTML and ZIP, generated from the same `src/` files as the hosted app.

## Run locally

For the development edition, use any static server, e.g. `python -m http.server 8080`; open `http://localhost:8080`. Browser modules often do not load via `file://` in development, so use **the generated offline HTML** for direct file opening.

```sh
npm ci
npm run check
```

Open `dist/index.html` through a static web server or `dist/downloads/dax-workbench-offline.html` directly from disk. The offline ZIP contains a standalone `index.html`, licence and README.

## Deploy

Publish this source in a public GitHub repository. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions**. A push to `main` runs tests and deploys `dist/` automatically. Use DNS CNAME / Pages custom domain settings if deploying to `dax.mightora.io`; the sample site metadata assumes that domain and must be updated if hosted elsewhere.

Build and CodeQL workflow badges are wired to `mightora/dax.mightora.io`; they are **not verified** until a public repository and successful workflows exist. The UI links to evidence; badge images themselves must not be treated as a security assurance.

The offline builder embeds the full official Mightora logo if `assets/mightora-logo.png` exists. If that asset is absent, a brand-coloured *offline wordmark fallback* is embedded. Fetch the official full logo from the official Mightora design-system instructions before shipping the final branded offline build. The online header always references the prescribed asset URL.

## Privacy & limitations

All DAX input remains in browser memory and is never uploaded by this application. Online mode downloads shared UI, author and badge resources; the separate offline build has Content Security Policy `connect-src 'none'` and uses embedded assets. The screen's Performance Resource Timing overview is limited; use F12 → Network → Preserve log to audit requests.

**Static heuristics are not semantic validation.** The tool cannot verify relationships, model metadata, whether a reference is a measure or column, actual calculated results, or engine performance. Complexity and style notes are prompts for review, not proof of incorrectness. The formatter is best-effort and is not a complete DAX parser; always review formatted code before using it in a model.

## Contributing

Source in `src/` is deliberately dependency-free. Add tests in `tests/` for bug fixes. Contribution guideline: retain the official Mightora shared components, accessibility and offline build parity; do not add telemetry or measure-upload endpoints.

## Licence

MIT, see [LICENSE](LICENSE).