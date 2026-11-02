# Benchmark comparison checks

The comparison browser suite verifies the public MSA-Kit example and the private
comparison flow without submitting a real evaluation. All API mutations in the
tests are intercepted. The example itself is loaded from the production build's
static resource, rather than replaced with generated scores.

## Independent observations

`e2e/fixtures/msakit-observations.json` contains the published MSA-Kit observation
at commit `c49b49f748902798ce90c21cb734baf11ea4a3f9`, including the two corrected Q
values, plus the six baseline observations selected from their original reports.
It records the parent public-snapshot SHA. It contains no capability key, private
task ID, email, account, log, or server path.

These expected values are fixed with the example. Updating the live baseline
catalog does not change the expected values of an already published example.
An intentional example update must identify its new source observations before
updating this fixture.

The assertions do not import application comparison selection, formatting, CSV
serialization, or coordinate helpers. They check:

- 26 datasets, seven methods, 182 observations, and all 1,274 raw metric positions.
- Original statuses and repeat coverage, source versions, parameters, resource
  limits, data version, and scoring definitions.
- Table values, five metric plots, all five matrix selections, and independent
  linear/log scatter coordinates, including KiB-to-MiB conversion.
- Actual JSON and CSV downloads for every dataset and for all datasets, including
  full numeric precision and source fields.
- A fixed private snapshot after the available baseline changes; downloads must
  continue requesting the snapshot currently shown on the page.

Bulk in-memory comparisons use `node:assert/strict` and indexed CSV rows. Browser
visibility, focus and state transitions use Playwright's waiting assertions.
This keeps the full checks while avoiding tens of thousands of trace steps in
numeric loops.

## Browser scenarios

The suite runs on desktop Chromium and Pixel 5-sized Chromium:

1. Public example provenance and the fixed original observations.
2. Full real-data consistency across charts, tables, matrices and downloads.
3. Immediate example use with paused or unavailable task-dispatch APIs, with zero
   submission requests and no new recent-evaluation record.
4. Normal entry of the same MSA-Kit URL still reaching the real submission flow
   through intercepted requests.
5. Private downloads retaining their opened snapshot version.
6. A candidate named MAFFT remaining distinct, overlapping points retaining true
   coordinates, zero resource values, negative normalized SP and missing Q.
7. Unmatched baselines and unsupported candidate data remaining explicit, without
   fake zero-valued points.
8. Keyboard dataset selection, sidebar position, a fixed candidate method,
   method filters, no-match download controls, Chinese and enlarged text.

The full-data scenario leaves the download menu open before navigating to the
next dataset. This also checks that the previous menu cannot obstruct the next
dataset's chart tabs on mobile.

## Run

Build the frontend using the repository's production-build script first, then run:

```bash
node node_modules/@playwright/test/cli.js test \
  --config playwright.comparison.config.ts
```

The default config starts an isolated static preview on port 5226. Set
`EASYMSA_COMPARISON_PREVIEW_URL` to check an existing preview instead, or
`EASYMSA_COMPARISON_PREVIEW_PORT` to use another local port. The JSON report is
`test-results/benchmark-comparison-results.json`, and screenshots and traces are
under `test-results/benchmark-comparison`.

Use an already installed Node 24 runtime and browser installation. On the current
Windows/WSL workstation the existing Linux browser cache is
`/home/zpl/.cache/ms-playwright`; no browser download is necessary.

API access, input/reference matching, retention, concurrent snapshot publication
and CSV serialization also have backend tests. The browser API stubs exercise
client behavior; they are not evidence of production authorization checks.
