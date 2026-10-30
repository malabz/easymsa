# 32 GiB targeted retry — 2026-10-29

The local Benchmark preview now includes `memory32-single-20261029` as an
independent batch. The existing 234-pair baseline and 15-pair repair batches are
unchanged. The default selection is the newest batch; explicit URLs retain their
selected historical batch. Benchmark is still reached through About.

## Scope and outcomes

| Method | Pairs | Complete | Memory limit | Timeout |
|---|---:|---:|---:|---:|
| HAlign 3 | 4 | 4 | 0 | 0 |
| MUSCLE 5 | 17 | 0 | 15 | 2 |
| T-Coffee | 20 | 0 | 19 | 1 |
| Total | 41 | 4 | 34 | 3 |

These are 41 targeted pairs across 20 datasets, not a new full 234-pair evaluation.
All runs use the existing `frozen-colon-n-20261027` inputs, one repetition, four CPU,
32 GiB task memory, 30 minutes per alignment/scorer and serial execution on a
shared server. HAlign 3 uses `java -Xmx28g -jar …`; this Java heap setting is distinct
from total process RSS and the container limit. No experiment was rerun during
the frontend import.

The four successful cases are the mitochondrial simulations with source labels
70, 75, 80 and 85. Their alignment times are 63.43, 63.29, 43.94 and 18.01 seconds.
Their seven metrics passed alignment validation and both scorers. All remaining
observations retain their failures, with unavailable numbers left null.

## Data provenance and preservation

Imported source: the server-generated `public/snapshot.json` for the completed
memory retry. No raw report, plan, private path or internal log is placed in the
frontend publication directory.

- Public snapshot SHA-256: `d2afe9700e9789e26c4d8122ddb8c93e9f089a0935e2da5469cf047c617059e4`.
- Formal report SHA-256: `bd8e219d10735b77db52dcf7ef0fdb50d0ec1239d93b3b9d5772ef6c3a66612a`.
- Both hashes agree with the server's completion record.
- The catalog, nine-method directory and both historical batch objects match the
  pre-import snapshot from commit `a293900` exactly.
- Unit guards pin the historical batch objects using SHA-256 after JavaScript
  JSON serialization, so changes to old measurements or metadata fail validation.
- Independent report comparison covers all 41 pairs and 287 metric records,
  including all 28 valid numeric observations, nulls, repetition counts and states.

## Display and downloads

The table, matrix, plots and downloads select one batch at a time. The overview
shows `4 / 41`, three timeouts, 34 other failures and the 32 GiB task limit. The
method parameters expose the 28 GiB Java heap. A method/dataset pair outside this
batch stays outside even when a historical result exists. There is no automatic
fallback or combined ranking across the two memory limits.

Memory is shown in MiB; JSON and CSV retain original KiB. For example, HAlign 3 on
source label 70 has 30,480,144 KiB = 29,765.765625 MiB. Runtime/memory observations
stored in the report's `mean` field with `value: null` remain visible as single
measurements, without standard deviation. Failures never become 1,800 seconds or
32 GiB data points.

Downloads support the full selected batch, the current dataset filter, and a
single dataset's detail page. Every download retains all seven metrics and only
the recorded pairs in that selection. An excluded dataset produces no result
rows instead of historical results or invented failures.

## Reproduction and verification

```sh
node node_modules/vitest/vitest.mjs run src --environment jsdom --maxWorkers=2
node scripts/build-benchmark.mjs
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts --project benchmark-chromium --project benchmark-mobile
```

Use the configured browser cache when running locally. Evidence is saved in
`D:\code\easymsa-memory32-20261029\frontend-verification`; the report comparison
there is reproducible with `audit_import.py` and the retained private source
report. The browser assertions use independent formatting, CSV parsing and chart
coordinate checks rather than importing production helpers.

The checks use the existing Node 24.18.0 runtime and installed browser cache.
The repository declares Node `>=24.21.0 <25`; the runtime and dependencies were
not changed for this data import.

Completed checks:

- Full frontend unit suite: **711 tests across 108 files passed**.
- TypeScript and production preview build: passed.
- Chromium desktop and mobile browser suite: **20/20 passed**, no failures,
  skips or retries, in 5.3 minutes. This run does not claim Firefox/WebKit coverage.
- Existing baseline: all 26 datasets and 1,638 metric records checked in the
  matrix, exact tables, point plots and actual downloads.
- Existing repair batch: all 15 pairs / 105 metric records retained and checked.
- New memory batch: all 41 pairs / 287 metric records checked; all 1,638 overview
  slots also checked so excluded pairs cannot pick up historical measurements.
- New batch downloads: 25 JSON and 25 CSV downloads per browser profile, including
  full batch, every included dataset, current filter, an excluded dataset and a
  Chinese-language detail page. Every CSV field and JSON object is checked.
- Valid values use report precision, with independent MiB conversion, tooltip
  checks and point-coordinate calculations. Failed results have no plotted point.
- Tests also cover batch switching, About navigation, English/Chinese, keyboard
  access, 375px/landscape layouts, 200% text and synthetic future repeat states.
- Source snapshot, built snapshot and the HTTP response at port 5208 have the
  identical public SHA-256 recorded above.

Desktop and mobile overview/detail screenshots were reviewed. The generated
browser JSON report, screenshots, unit/build logs and independent audit are
retained in the evidence directory. This delivery updates the local preview only;
it does not deploy the production site or publish Git changes.
