# Benchmark website catalog and green theme — 2026-10-30

Current catalog update: [six displayed methods, excluding T-Coffee](BENCHMARK_SIX_METHODS.md).

The website now displays **HAlign** for the historical `halign4` method and
excludes HAlign 3 and Kalign 3 from the Benchmark interface and its download
menus. The Comparison Studio layout remains, with the site's green accent
(`--color-accent: #0f766e`) applied to buttons, tabs, markers, selected rows,
focus rings and named-batch heat colors. Sidebar and secondary surfaces use
pale green; failures retain text and their distinct state.

## Data and scope

`website.ts` projects the validated archive before page selection. Matrices,
scatter plots, individual plots, exact tables, version disclosures, filters,
coverage and both download formats consume this same seven-method snapshot.
An old URL cannot restore an excluded method. Full-catalog and full-batch
controls refer to the website's seven-method catalog.

| Website view | Pairs | Complete | Timeout | OOM |
| --- | ---: | ---: | ---: | ---: |
| Latest records | 182 | 127 | 21 | 34 |
| Latest RNA | 42 | 30 | 11 | 1 |

Latest sources are 134 baseline, 11 adapter repair and 37 memory retry records.
Historical website batch sizes are 182, 11 and 37. The full archive continues
to contain the original 234, 15 and 41 records respectively. HAlign retains its
original method ID, version, parameters, batch provenance and measurements.
No claim of a newly evaluated algorithm version is introduced by this label.

The original `public/benchmark/snapshot.json` SHA-256 is unchanged:

```text
d2afe9700e9789e26c4d8122ddb8c93e9f089a0935e2da5469cf047c617059e4
```

## Verification

Evidence directory: `D:\code\easymsa-green-20261030`.

- Full unit suite: 112 files, 771 tests passed (`unit-host.log`).
- TypeScript and production build passed (`build-host.log`).
- All 40 distinct browser regression scenarios passed across desktop, mobile and
  existing routes after correcting an asynchronous test assertion. The full run
  had 39 passes and one immediate-count failure during a batch switch
  (`browser-host.log/json`); the assertion now waits for the new chart to render.
  The four affected/screenshot checks then passed on desktop and mobile
  (`browser-confirmation.log/json`). No product workaround was needed.
- Independent browser checks compare all 182 × 7 = 1,274 latest metric records,
  historical website batches, table text, coordinates, tooltips, source identity
  and actual CSV/JSON downloads to the unchanged archive. Separate archive tests
  continue to check all original methods and batches.
- New regression checks cover names, removal from catalogs and metadata, old
  URLs, empty post-filter batches, shared site accent and immutable source data.
- Desktop/mobile tests also exercise English/Chinese, keyboard controls, 200%
  text, no-reference cases and future repeated measurements.
- Final visual evidence: `desktop-detail.png`, `desktop-overview.png`,
  `mobile-detail.png` and `mobile-overview.png` in the evidence directory. Captures
  wait for language-transition animation to settle. `in-app-preview.png` records
  the refreshed user preview on port 5208.

The initial restricted-process build/test attempts encountered local file-access
errors. Normal host execution resolved them without changing dependencies or
system configuration. This local change does not rerun experiments, deploy the
website, or commit/push Git changes.

## Reproduction

```powershell
node scripts/build-benchmark.mjs
node node_modules/vitest/vitest.mjs run src --environment jsdom --maxWorkers=2
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\code\.playwright-browsers'
$env:EASYMSA_E2E_PORT = '5218' # choose an unused test port
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts --project=benchmark-chromium --project=benchmark-mobile --project=existing-route-regression
```

The existing local preview on port 5208 serves the rebuilt `dist` directory.
