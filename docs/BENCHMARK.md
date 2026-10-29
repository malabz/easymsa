# Benchmark: public results and dataset catalog

The Benchmark feature is a read-only public view, available at `/#/benchmark` and
`/#/benchmark/datasets/:caseId`. It uses the current EasyMSA layout and language
settings. The public entry is a horizontal link on **About** (/#/about); Benchmark
is intentionally absent from both desktop and mobile primary navigation. Direct
Benchmark URLs remain supported. See [UI decisions](BENCHMARK_UI.md).

GitHub submission, automatic Docker execution and publication requests
are planned separately; there is no inactive submission form.

## Current data

`public/benchmark/snapshot.json` now uses the frozen **frozen-colon-n-20261027** data
version: 26 cases, 20 DNA / 6 RNA, 20 complete references and nine methods. The
234-unit real single-run batch completed on 2026-10-28 and is now included in the
local preview: 163 complete results, 19 timeouts and 52 other failures. Missing
metrics stay empty; failures are retained rather than replaced by zero scores.
Three mitochondrial input copies replaced 40, 411 and 3491 sequence colons with N.
Original files were retained. Public preprocessing records include counts and
original/processed checksums, with no sequence data or server paths.

There are 14 scientific simulation cases with source similarity labels
70, 75, 80, 85, and 90–99. RNA generation provenance remains unconfirmed. Scientific
simulation provenance is separate from the evaluator's `synthetic` development
fixture flag. Large mitochondrial samples use sampling with replacement; their
sequence counts do not represent an equal number of independent source sequences.

The catalog importer uses reviewed source metadata hashes and a curated mapping:

```sh
node scripts/import-benchmark-catalog.mjs /path/to/stats.json /path/to/manifest.yaml
```

The two files are from the original `dna-rna-v1` bundle. The importer rejects
changed metadata until its provenance mapping is reviewed and versioned. It does
not parse arbitrary YAML or infer scientific provenance from sequence contents.
The output remains a draft catalog without scores. **Do not run this catalog-only
import over a published snapshot containing result batches.** Use an alternate
output path when updating a live catalog.

## Result model and publication

The current public model has `schema_version: 2` (v1 remains readable) and four top-level fields:
`schema_version`, `catalog`, `methods`, and `batches`. A batch is one comparable
set of results with a dataset version, public environment, thread count, scoring
rules, explicit repeat count, execution limits and locked method versions/parameters. Results from different batches are
never merged on the page. Select a batch explicitly to inspect its values.

The evaluator project supplies `msa-bench export-public` and `validate-public`.
Use its export documentation to prepare curated public metadata, export a formal
report, and validate the resulting snapshot. Diagnostic runs are not public
benchmark evidence. Formal batches require a frozen catalog and completed report verification.

After validation, copy the exported snapshot into `public/benchmark/snapshot.json`,
run tests/build, and review the page before publishing a new site release. The
exporter adds a new batch to its input snapshot and rejects duplicate batch IDs.
Keep the source report and original alignment artifacts privately for reproduction.

Only public fields are exported. Never publish the engine's raw `summary.json`:
it contains internal plans, paths and runtime configuration. Hardware descriptions
and method parameters must be curated, with documented path placeholders where
needed. Public downloads contain the same data used by the view.

## Reading results

- Time is elapsed alignment time; memory is peak RSS, with units shown in the UI.
- Q and TC require a valid reference. Missing references are “not applicable”.
- SP-family scores are provided as details; the site does not invent a composite
  ranking or compare their raw values across unrelated datasets.
- Complete, partial, failed, timeout, unsupported and not-run results are distinct.
  Partial metrics retain their valid/planned repeat coverage.
- The browser formats the evaluator's aggregates, including available standard
  deviations/ranges; it does not recalculate biological scores.

## Local verification

```sh
npm test
npm run build:benchmark
npx playwright test --config playwright.benchmark.config.ts
npm run preview:benchmark
```

Browser tests use the current real catalog, a preserved historical empty catalog and explicitly intercepted test-only
result fixtures. They never submit tasks to the live API. Test results must not be
copied into `public/` or imported by production components. The current catalog
guard checks the real case counts, provenance, reference coverage and resolved preprocessing counts.

The preview is `http://127.0.0.1:5208/#/benchmark`. Its build uses the root path and a
local `/api` URL; Benchmark itself needs no API. This preview does not connect to
the production computation service. Install Playwright browsers first if needed
(`npx playwright install chromium firefox webkit`); if using a separate browser
cache, set `PLAYWRIGHT_BROWSERS_PATH` to the same location for installation and tests.

## 后续工作边界

首期交付成绩展示和离线报告接入。后续流程为：用户提交 GitHub，后台固定源码版本并在
Docker 环境中自动构建与评测，提交者通过私有入口查看结果，再申请公开，由管理员审核。
任务记录、原始日志和公开成绩快照应独立维护。MSA-Kit 的标题、模糊碱基及运行接口约定，
需要在开放自动提交前与评测平台统一。

## Current single-run completion

The server batch completed on 2026-10-28 at 15:54:13 UTC+08:00. The complete
report and public snapshot passed checksum and all-value verification; the local
preview now displays all 234 observations. Each of the 26 datasets has at least
one valid method result. There were no replacement retries.

After import, 107 frontend unit tests, the TypeScript/build checks and 22 browser
tests passed without failures, skips or retries. Both Chromium and mobile tests
checked all table metrics, charts and overview/detail JSON/CSV downloads. Raw
measurement audit independently matched 1,077 values across 457 saved log files.

Evidence and the Chinese final report are under
`D:\code\easymsa-single-benchmark-20261027\FINAL_ACCEPTANCE_20261028.md` and
`final-browser-evidence/` in the same records directory. The public snapshot,
built snapshot and local HTTP response share the same SHA-256.

The page labels this as a single measurement, displays valid/planned coverage,
4 CPU / 16 GiB / 30-minute limits and shared-server conditions. No cross-dataset
composite ranking, production deployment or Git publication was performed.


## Visual comparison explorer (2026-10-28)

The overview now compares datasets × methods using a selectable metric matrix;
color encodes relative performance within one dataset. Click a dataset or result
cell for five aligned dot plots and an exact seven-metric table. Time/memory have
logarithmic and linear views, SP has explicit Avg/Scaled choices, and Q/TC can be
explicitly zoomed from the default 0–1 range. Download data offers the current
filter selection or the full batch. Memory is displayed in MiB; exports retain
original KiB. Details, semantics and reproducible UI checks are in
[BENCHMARK_UI.md](BENCHMARK_UI.md).
