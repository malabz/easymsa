# Benchmark verification — 2026-10-27

## Baseline and scope

The independent worktree starts from `adcb0d300fd59d5eebe582593b88e457eb604d12`
and restores all 487 files from the actual `20261026-architecture-round1` frontend
source archive. Its verified SHA-256 is
`42b329a3748bd77bdd98d0502a51ab15a04cc892219ce0ad2c98f7c46a1e4068`.
This includes the production architecture changes and existing test updates that
were not committed in that base. The original frontend working directory was not
edited. No commit, push or production deployment was performed.

For the initial delivery, existing-file edits against that restored release were limited to README,
package scripts, App routing, Header navigation, PageMetadata, and the language
dictionary. No existing source file was removed. Benchmark implementation,
catalog, import utility, contract fixtures, documentation and tests are additions.

## Initial delivery checks

| Check | Result |
| --- | --- |
| Frontend full suite | 635 passed, 105 test files, no failures |
| Final affected frontend tests | 96 passed after mobile table styling adjustment |
| TypeScript and preview build | Passed |
| Browser suite | 34 passed, no skips or automatic retries |
| Evaluator Linux full suite | 99 tests: 93 passed, 6 skipped, no failures |
| Shared Python/TypeScript snapshot corpus | 48 scenarios accepted/rejected consistently |
| Real snapshot CLI validation | 26 cases, nine methods, zero result batches |
| Public build | Snapshot matches source; no test scores/fixture markers included |
| Baseline comparison | Six existing files changed; no missing release files |

The browser suite covers Chromium, Firefox, WebKit and a 390 px mobile viewport,
plus ten existing route, submission and result/viewer regression scenarios. It
checks real empty data, filters, input issues, test-only populated batches, downloads,
failure/retry, bilingual UI, accessibility and keyboard horizontal scrolling.

The first browser setup used a preview base path inconsistent with the build; this
was corrected in the preview configuration. Test selectors were then aligned with
accessible combobox names. Windows WebKit exposed a lazy-data timing race in test
preparation; navigation now waits for the actual snapshot response before UI
assertions. Tests execute one browser worker, with the original 12 s assertion and
60 s test limits. The final full run passed without retries.

Restricted Windows process permissions initially prevented native file realpath
operations during archive extraction, browser installation and Vite Worker builds.
The verified source was restored through bounded file copying, and authorized
build/browser checks were run in the normal local environment. No project behavior
was changed to hide permission failures.

Runtime used: native Windows Node **24.18.0**, Vite **8.3.2**, Vitest **5.0.3**;
evaluator tests used WSL Python **3.12.3**. The existing Node engine declaration
requires >=24.21; it was left unchanged. Recorded native checks passed on the
available runtime; future environments should use the repository-declared version.

## Initial delivery evidence limits (historical)

The six skipped tests require a configured Docker runtime acceptance environment.
No real alignment benchmark or production container acceptance was run. Engine
report integration tests use the synthetic executor and test-only descriptors;
they do not produce publishable benchmark evidence.

The full frontend suite preceded the last mobile table nowrap/scroll-region style
change; the affected 96 tests and all 34 browser scenarios passed afterward.

The public catalog is still draft. It contains 14 scientific simulation cases,
six RNA cases with unconfirmed generation provenance, and three mitochondrial
sampling cases with retained colon-character issues. All classifications remain
unconfirmed and the public batch list is empty.

Local review: `http://127.0.0.1:5208/#/benchmark`. Reproducible commands and report
import instructions are in [BENCHMARK.md](BENCHMARK.md).


## Editorial UI revision

The About page and Benchmark overview/detail were redesigned after review.
Benchmark was removed from desktop and mobile primary navigation; About now
provides its single descriptive entry. Citation links, scientific data contracts,
batch isolation and export semantics are preserved.

The revision uses scoped styles, open sections and thin rules in place of repeated
cards. Dataset metadata and results remain tables; empty charts stay explicit.
A 375px / 200% text browser check found that the large Benchmark title overflowed.
The heading now wraps and mobile statistic spacing no longer scales into narrow
columns. The failing scenario remains in the browser suite.

Affected frontend tests: **101 passed across six files**. The TypeScript/preview
build passed after the responsive fix. No evaluator or real alignment run was
needed for this UI revision. The public snapshot and built snapshot have identical
SHA-256: 85b09eb6edd95f6d65e2b904b6c010b9b5e3476f125ca96fec1679d633ce1367.

See [UI decisions](BENCHMARK_UI.md) for layout and accessibility maintenance.

The final UI browser matrix passed **42/42**, with no skips, failures or retries:
eight Benchmark scenarios each in Chromium, Firefox, WebKit and a mobile viewport,
plus ten existing route/submission/result regressions. The added checks exercise
About-to-Benchmark discovery in both languages, no primary navigation entry,
375px portrait and 812px landscape, reduced motion and 200% root text. The full
run took 257.9 seconds.

Normal-size desktop and mobile screenshots were inspected after the final build.
The final report and screenshots are in the local sibling review folder
easymsa-benchmark-redesign-20261027. The local review entry is now
http://127.0.0.1:5208/#/about.

## Single-run baseline preparation and v2 integration

On 2026-10-27 the real 234-unit baseline was started on the approved server, after
10/10 real container acceptance tests and 18/18 tiny DNA/RNA tool chain checks.
The current engine full suite ran 111 tests: 101 passed, with the 10 real-runtime
tests separately executed successfully. The 26-case frozen package passed title,
length, record-count and 20 reference-consistency checks. Colon replacements were
exactly 40, 411 and 3491; original data remained unchanged.

Website preparation passed 107 focused unit tests, TypeScript/build and 46 browser
checks with no failures or skips. The shared contract corpus has 57 v1/v2 cases.
The public catalog now records the frozen data and preprocessing, but real scores
are not inserted until the full report is ready. The newly added real-result
browser check and 234×7 value comparison are pending that report; they are not
included in the 46 already passed browser checks.

Completion logs and final value verification are written to
`D:\code\easymsa-single-benchmark-20261027`. This note records preparation and
launch, not completion of the full benchmark. No production deployment or Git
publication took place.

## 2026-10-28 full result consistency checks

The real-result browser test now visits all 26 datasets and checks all 234 method
results: 1,638 table metric cells, 104 charts (method identity, values, coverage,
bar widths and omissions), and JSON/CSV downloads from the overview and every
detail page. CSV is parsed independently and all 24 columns are compared with
the snapshot; the overview and combined detail exports each contain 1,638 metric
rows. The RNA reference case is also checked in Chinese. A successful real run
attaches `real-results-consistency.json` with its verified scope.

The new assertions passed four Chromium/mobile fixture checks with no failures,
skips or retries. They cover separate batches, failure states, valid zeros,
ranges, CSV quoting and both languages. This is validation of the assertions,
not yet acceptance of the still-running real batch. The checks found and now
cover a display bug: no-reference datasets must suppress reference-specific
messages only for Q/TC, not the failure reasons of time and memory metrics.
After that correction, the 107 focused frontend tests and TypeScript/build
passed. Local evidence: `consistency-browser-20261028.json`,
`consistency-unit-tests-20261028.log`, and `consistency-build-20261028.log` in the
single-benchmark records directory.

The local Windows importer also passed six native filesystem/integrity tests
after replacing its Linux-only directory sync with a platform-aware local
writer. Frozen server engine code and measured results were not changed.
Final real-result acceptance is still recorded separately by the completion
pipeline and its browser test attachments.

## Final real-data acceptance — 2026-10-28

The real batch and local import are complete: 163 complete, 19 timeout and 52
other failed observations, all 234 retained. After actual import, 107 unit tests,
TypeScript/build and 22 browser tests passed with zero failures, skips or retries.
Both Chromium and mobile ran the full real-result matrix and emitted passing
consistency attachments: 1,638 table metric cells, 104 charts, 27 overview/detail
JSON downloads and 27 CSV downloads per browser, plus the Chinese RNA case.
Independent log parsing matched 1,077 numeric measurements in 457 source files.
The final raw/public verification, browser report, attachments and screenshots
are archived under `D:\code\easymsa-single-benchmark-20261027\final-browser-evidence`.
`FINAL_ACCEPTANCE_20261028.md` in its parent folder records the final hashes and
view links. The local HTTP preview serves the same validated snapshot.

## Matrix and dot-plot acceptance — 2026-10-28

The approved chart design is implemented locally: seven-metric overview matrix,
five aligned detail plots, exact-value tables, scoped JSON/CSV downloads and
responsive bilingual controls. Benchmark remains discoverable from About.
Implementation and maintenance rules are in [BENCHMARK_UI.md](BENCHMARK_UI.md).

The scientific snapshot is unchanged: 26 datasets, nine methods, 234 single-run
observations (163 complete, 19 timeout, 52 other failures). Source, build and HTTP
preview all have SHA-256
`acf5315fe7449eae65988c8ffe9f2eb939c653e60a86448a05f3b763cf2a393b`.
This revision did not rerun experiments, change report fields or alter scores.

Executed checks:

| Check | Actual outcome |
|---|---|
| Full frontend unit suite | 681 tests, 107 files passed before the final filter regression was added |
| Final affected unit suite | 147 tests, eight files passed, including the new rapid clear/search regression |
| Final TypeScript and preview build | Passed |
| Full browser matrix | 40 passed, two failed out of 42; no skips or automatic retries |
| Final affected browser rerun | 12/12 passed after fixes in Chromium, Firefox, WebKit and mobile Chromium |
| Combined latest observations | All 42 distinct scenarios have passing observations; this is a full run plus targeted rerun, not a claimed single clean full run |

The full browser run checked all 1,638 overview metric cells and all 1,638 exact
table values in **each** of the four browser configurations. It also checked 182
metric panels, 1,638 method/metric plot slots, 28 JSON downloads and 28 CSV downloads
per configuration, including the Chinese RNA case. CSV validation independently
parses all 24 columns. Missing values retain their reasons and have no plotted
dot; valid zeros are kept. Colors and point coordinates are independently checked
against the raw report. Numeric report/export equality is exact; a 0.001 percentage
point tolerance is used only for browser CSS coordinate serialization.

Fixtures cover negative SP, zeros, tied values, one valid method, all unavailable,
no reference, partial results, multiple batches and reported SD/ranges. Additional
checks cover filtered versus full downloads, detail exports, deep links and return
state, both languages, keyboard interactions, accessibility scans, narrow portrait
and landscape layouts, and 200% text. Fixture scores are absent from public assets.

The two failures in the full run exposed a rapid clear/search query-state race on
mobile and WebKit native-select intrinsic-width overflow with enlarged text. The
query update now keeps the latest pending URL state, and batch selects establish
their own layout context. The intermediate rerun passed 11/12 and exposed the
same select issue on the overview; the final rerun passed all 12. Earlier checks
also corrected timeout labels, focus-triggered tooltip positioning, mobile download
menu placement and enlarged-text table sizing. Document overflow is not hidden.

Local evidence under `test-results/`:

- `benchmark-redesign-unit-full.log`, `benchmark-redesign-unit-final.log`
- `benchmark-redesign-build.log`
- `benchmark-redesign-crossbrowser-before-fixes.json`
- `benchmark-redesign-regression-final.json`
- `benchmark-redesign-acceptance.json` (latest result per distinct scenario)
- `benchmark-redesign-value-evidence.json` (per-browser consistency attachments)
- `benchmark-redesign-preview-verification.json` (source/build/HTTP hashes)
- `benchmark-redesign-full-evidence/` (preserved broad-run artifacts)

The local runtime is Node 24.18.0. The repository currently declares
`>=24.21.0 <25`; this pre-existing environment mismatch was not changed. The
commands below actually passed on the available runtime; they do not claim
validation of every supported Node version.

```powershell
node node_modules/vitest/vitest.mjs run src --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism
node node_modules/vitest/vitest.mjs run src/features/benchmark src/lib/benchmarkCatalog.test.ts src/lib/benchmarkContractParity.test.ts src/routes/AboutPage.test.tsx src/components/layout/Header.test.tsx --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism
node scripts/build-benchmark.mjs
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\code\.playwright-browsers'
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts --grep 'filters,|small screens|responsive charts'
```

Preview: `http://127.0.0.1:5208/#/benchmark`; example detail:
`http://127.0.0.1:5208/#/benchmark/datasets/rna_255`. No production deployment,
Git commit or push was performed. Existing unrelated workspace changes remain.
