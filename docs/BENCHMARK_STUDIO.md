# Comparison Studio visual update — 2026-10-30

**Subsequent user-requested update:** the website now uses the site's green
accent, names the historical `halign4` method **HAlign**, and excludes HAlign 3
and Kalign 3 from the website and its downloads. See [current UI behavior](BENCHMARK_UI.md)
and [catalog/theme verification](BENCHMARK_GREEN.md). The blue, nine-method
design and verification below describe the preceding accepted iteration.

This local update implements the user's selected second design, “Comparison
Studio / 明亮工作室”, in the existing EasyMSA frontend. It does not rerun
experiments, publish a site, or create a Git commit.

## What changed

- A pale blue dataset sidebar groups DNA/RNA and retains real counts, lengths,
  source labels and the existing search/filter state.
- The main workspace uses white, cobalt blue, stronger headings and thin rules.
  The overview retains its results matrix; details foreground the scatter plot
  and an aligned method/resource/quality list.
- Axis controls sit below the plot; exact values and individual metrics remain
  separate views. Full versions, conditions and provenance stay available in
  disclosures and precision tooltips.
- Mobile uses an expandable dataset menu. Simulation subtitles retain their
  source labels. Large text, keyboard focus, missing values and failure states
  remain supported.
- The empty work-return spacer is removed on these pages. An actual work-return
  link is retained. The existing site header/footer and About entry remain.

## Preserved scientific behavior

The public v2 snapshot is unchanged byte for byte:

```text
d2afe9700e9789e26c4d8122ddb8c93e9f089a0935e2da5469cf047c617059e4
```

The latest view still contains 234 method/dataset pairs: 178 completed, 22 timed
out and 34 memory-limit failures. Their sources are 182 baseline, 11 adapter
repair and 41 memory retry records. All three original batches remain available.
The RNA filter retains 54 pairs, with 42 completed, 11 timed out and one
memory-limit failure.

Whole-record latest selection, seven metric values, original units, Q/TC's
default 0–1 range, historical batches and CSV/JSON scope were preserved.
Presentation-only tick spacing, label placement, colors and unit formatting do
not change any scientific values. The illustrative design's incorrect metadata
was replaced by actual catalog values.

## Local preview and reproduction

The existing preview serves the built `dist` folder on port 5208. Rebuild after
editing source. The standard checks are:

```powershell
node scripts/build-benchmark.mjs
node node_modules/vitest/vitest.mjs run src --environment jsdom
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\code\.playwright-browsers'
$env:EASYMSA_E2E_PORT = '5214'
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts --project benchmark-chromium --project benchmark-mobile --project existing-route-regression
```

Use a free isolated test port. The test configuration starts its own local
preview. The installed validation runtime is Node 24.18.0; the package engine
declaration is >=24.21.0 <25. No runtime or dependencies were installed or changed
for this visual update.

The local evidence directory is `D:\code\easymsa-studio-20261030`. It contains
the pre-change data manifest, full test logs, regression traces, real browser
screenshots and source/dist/served data checks. The independent browser oracle
checks all 1,638 latest metric records, original batches, coordinates, tooltips,
tables and actual downloads. Test fixtures remain outside published data.

See [design QA](../design-qa.md) for the reference comparison, iterations and final
visual verification; [UI behavior](BENCHMARK_UI.md) documents the preserved
selection and download contracts.

## Executed verification

- Full unit suite: **111 files, 766 tests passed** (`unit-verified.log`).
- TypeScript and production build: passed (`build-accepted.log`). The final CSS
  edit preceded this build; the preview is not using an older source revision.
- Browser coverage: **38 distinct case/project combinations**, comprising the
  desktop/mobile Benchmark checks and existing-route regressions. Earlier
  failures were preserved, corrected and rerun. The final four responsive and
  enlarged-text cases passed on port 5218, including the unchanged mobile zoom
  bounds assertion. This is combined coverage across documented runs, not a
  claim that the initial full run passed unchanged. `combined-verification.json`
  records 38 latest passing observations, zero failures and zero skips.
- Accessibility inspection: 17 real views, no reported violations after fixes,
  including Chinese/English, desktop/mobile and historical heat colors.
- Latest-view consistency: **234 × 7 = 1,638 metric records** checked against the
  original snapshot across matrix, point plots, exact values, tooltips and real
  CSV/JSON downloads. Historical batches and filtered exports remain isolated.
- Raw snapshot, built snapshot and served snapshot retain the same SHA-256 as
  the pre-change baseline. No synthetic score was added to the public resource.
- Accepted browser captures: 12 Chinese/English overview/detail views, zero
  console errors, page errors or failed requests. All 22 served build assets
  match the accepted `dist` files.
- `git diff --check` passed. HEAD remains
  `a2939001a6d8310591f3e7f025b3e378ae076b19`.

The initial test failures exposed accessible-label changes, insufficient text
contrast and small-screen geometry. Tests were migrated only where the visible
control changed; numeric expectations stayed intact. The final zoom defect was
caused by a global reduced-motion duration briefly animating chart padding.
Geometry transitions are now disabled explicitly, and the original strict
browser assertion passes.
