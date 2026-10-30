# Current website catalog

The subsequent October 30 catalog update displays HAlign instead of HAlign 4
and excludes HAlign 3 and Kalign 3. The archive and historical scientific records
are unchanged. The nine-method counts below describe the original full archive;
the current website scope and downloads are documented in [BENCHMARK_UI.md](BENCHMARK_UI.md).


# Latest-record reading experience: verification

Date: 2026-10-29. Workspace: `D:\code\easymsa-benchmark-20261027`.
Preview: <http://127.0.0.1:5208/#/benchmark?scope=latest&metric=wall_seconds>.

This change is frontend-only. It does not rerun experiments, edit measurements,
create a new experimental batch, publish a site or commit/push Git. Existing
32 GiB import changes in the working tree were preserved.

## Data identity

Source, built asset and locally served snapshot have the same SHA-256:

```text
d2afe9700e9789e26c4d8122ddb8c93e9f089a0935e2da5469cf047c617059e4
```

Independent selection and the browser oracle confirm:

| Scope | Records | Complete | Timeout | Memory limit |
|---|---:|---:|---:|---:|
| Latest, all | 234 | 178 | 22 | 34 |
| Latest, RNA | 54 | 42 | 11 | 1 |

Latest source counts are 182 baseline, 11 adapter repair and 41 memory retry.
Historical batch sizes remain 234, 15 and 41. The selection keeps a newer failure
even if an older success exists, and all seven metrics come from the same source
record. No cross-condition heat ranking appears in the latest matrix.

## Checks and evidence

The full frontend suite covers existing behavior plus whole-record selection,
filtered statistics/navigation, sparse batches, immutable originals and traced
CSV/JSON exports. Chart-specific tests cover no reference, zero/negative values,
single/all-failed/coincident points, partial repeat statistics, true coordinates,
label avoidance and keyboard-versus-pointer interaction.

Browser tests use an independent snapshot oracle for 1,638 latest metric records:
all 26 dataset matrices, aligned plots, exact tables, tooltips, scatter coordinates
and real downloads. Historical batches retain their dedicated checks. RNA and
method filtering, all-latest versus filtered downloads, old batch links, both
languages, keyboard access, small screens and 200% text are also exercised.
Ten existing-route tests cover navigation and public task/result flows.

Executed results:

| Check | Actual outcome |
|---|---|
| Full frontend unit suite | **750/750 passed**, 110 files, 63.54 s |
| TypeScript project check and production build | **Passed** |
| Browser full run (attempt 2) | All 38 bodies executed: 35 passed, 3 failed; original/latest measurement and download checks and all 10 existing-route checks passed |
| Browser focused rerun (attempt 3) | 7/8 passed; a remaining mobile menu persistence issue was exposed and fixed |
| Browser final affected checks (attempt 4) | **6/6 passed**, desktop/mobile, clean exit, 35.5 s; clears every remaining failed scenario |
| Source/built/served data identity | **Identical SHA-256**, unchanged from the start of this work |
| Updated documentation links / Git whitespace check | **Passed** |

All 38 distinct browser scenarios have passing observations after the necessary
fixes. This is not described as one uninterrupted 38/38 run: earlier failures and
their traces remain available. Two attempt-2 failures came from a native disabled
`option` matcher; its disabled DOM property is now checked directly. Actual menu,
keyboard, overflow and label bugs were fixed in production and covered by tests.
The final check additionally compares actual label-text rectangles for overlap,
axis ticks and the visible popup bounds at 375/812 px with 200% text. No test was
skipped to clear a failure.

Logs and screenshots are retained in `D:\code\easymsa-reading-20261029`:
`unit-tests-final.log`, `build-final.log`, `data-integrity.json`, `attempt-2.log`,
`attempt-3-results.json`, `attempt-4-results.json`, `attempt-4.log`, and the per-test
screenshots/traces under each attempt directory. The restricted initial browser
runs completed test bodies but stalled during reporter teardown; those attempts
are represented by their actual console logs and traces, not stale JSON reports.
The final reruns used normal local process permissions and wrote reports cleanly.

## Reproduction

From the frontend directory, using the installed Node executable:

```powershell
node node_modules/vitest/vitest.mjs run src --environment jsdom --maxWorkers=2
node scripts/build-benchmark.mjs
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\code\.playwright-browsers'
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts --project benchmark-chromium --project benchmark-mobile --project existing-route-regression
```

`build-benchmark.mjs` runs the TypeScript project check before the production
build. This workstation uses Node 24.18.0, below the repository's declared
>=24.21.0 requirement. Dependencies and the system runtime were not changed.
A restricted temporary-directory test attempt failed while loading transformed
files; the normal local test run is used for test outcomes. Both logs are retained.
Firefox/WebKit are not part of this execution's claimed browser coverage.

## Corrections made during verification

- Replaced a fixed-width filter row with a wrapping layout after 200% landscape
  text caused horizontal overflow. Made filter panels exclusive, dismissible with
  Escape/outside click, and reset them when the displayed batch changes.
- Kept keyboard-focused result details stable when focus-driven scrolling moved
  a different row under the stationary pointer.
- Moved scatter exact details into a closable, viewport-bounded popup for touch;
  enlarged labels and x ticks now use available chart width without moving points.
  Dense label groups get separate placement slots and additional plot height at
  enlarged text sizes; normalized data-point coordinates remain unchanged.
- Retained explicit method/version/parameter pending states for an empty catalog.
- Updated tests for the intentional new defaults and sparse-batch scope instead
  of removing their historical data or behavior checks.

See [interface and selection rules](BENCHMARK_UI.md) for the URL and export contract.
