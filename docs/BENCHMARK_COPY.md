# Concise Benchmark copy and dataset names

Benchmark uses one bilingual dataset-name function for headings, sidebar items,
matrix links, tooltips and accessible names. Examples: `线粒体 · 10,000 条`,
`16S · 1,000 条`, `线粒体模拟 · 70%`, `RNA · 255 条`. Grouped lists use the
short suffix. Simulation percentages retain their source-parameter meaning;
they are not computed from benchmark outputs.

Search accepts either language, sequence counts with/without commas, and original
dataset IDs. Route IDs, exported fields, original units, selection rules and
measurements are unchanged. The six-method latest view remains 156 records and
1,092 metrics.

The main page shows results and controls. One closed **Experiment details**
disclosure contains dataset provenance, sampling/preparation, run conditions,
method versions/parameters and metric definitions. No defensive explanations are
moved into hidden accessibility text. Known input issues remain flagged beside
the dataset heading; counts and preparation details are available on expansion.

Status copy distinguishes Not tested (outside the batch), Not evaluated
(planned without a completed observation), failures and missing references.
Exact tables show repeat coverage once per row. Partial/multi-run tooltip
coverage remains available. Exports retain full metric-level coverage.

The download menu shows scope and a short count instead of export-policy prose.
SP/Q/TC definitions are centralized in experiment details. Plot legends retain
batch names and memory limits. Scientific notation in method rows stays on one
line; numeric column widths align across methods.

Validation evidence: `D:\code\easymsa-copy-20261030` (build, unit and browser
logs plus desktop/mobile screenshots). This is a local UI update; no experiments,
Git commits/pushes or production deployment are part of this change.

## Verification — 2026-10-30

- Full unit suite: 113 files, 781 tests passed (`unit-full.log`).
- TypeScript and local-preview production build passed via
  `node scripts/build-benchmark.mjs` (`build-final.log`).
- Desktop Chromium and mobile Chromium: 32 distinct scenarios covered. The full
  run passed 28; the four remaining cases exposed narrow-screen numeric overflow
  and test reads before a view change had committed. After the responsive layout
  and explicit view-readiness fixes, all six targeted copy/responsive scenarios
  passed (`browser-final.log`, `browser-responsive.log`). No skipped cases.
- Both viewport runs checked all 156 latest records and 1,092 metrics against the
  report, including actual CSV/JSON downloads, matrix values, exact tables and
  chart positions. Baseline, repair and 32 GiB batch isolation also passed.
- Name checks cover all 26 datasets and both languages; original ID links/search,
  source-parameter labels, collapsed details, filters, keyboard access, accessible
  contrast and 200% text resizing were exercised.
- The frozen public snapshot has no diff. SHA-256:
  `D2AFE9700E9789E26C4D8122DDB8C93E9F089A0935E2DA5469CF047C617059E4`.

Earlier unsuccessful runs and their logs are retained in the evidence folder;
they are not counted as passing validations. The final screenshots use the
`benchmark-chromium-*` and `benchmark-mobile-*` filenames.
