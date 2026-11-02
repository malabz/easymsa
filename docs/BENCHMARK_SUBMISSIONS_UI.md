# Anonymous Benchmark submissions

The Benchmark toolbar offers **Evaluate my program** and **Recent evaluations**.
The entry remains inside Benchmark, reached from About EasyMSA. There is no
GitHub sign-in, account menu or administrator route.

## Submit and return

Only the public GitHub repository URL is required. Notification email is optional;
method name, branch/tag/commit and supported DNA/RNA types are under More settings.
The backend resolves the default branch and pins a full commit. A successful
submission opens its progress page directly.

`GET /api/benchmark/status` provides readiness and `email_available`.
`POST /api/benchmark/client` establishes the browser's anonymous cookie and returns
a CSRF token. Creation uses that token plus a persistent `Idempotency-Key`.
The response is `{run, access_key}`; run DTOs include `expires_at` and `email_status`.
All subsequent progress, log, cancellation and result requests use the individual
task key in `Authorization: Bearer ...`, including actual CSV/JSON downloads.

Creation drafts and their idempotency keys survive reloads. Different in-flight
submissions retain separate keys. A recovered draft preserves its original request
language and parameters. An explicit Retry saved submission button can recover a
lost accepted response even when new dispatch is paused; the backend still rejects
new requests while paused.

## Browser and email recovery

`easymsa.benchmarkAccess.v1` stores a JSON array of validated task records:
`{app:"easymsa-benchmark", version:1, id, key, method_name, repository_url,
created_at, expires_at}`. It stores access information, not result datasets.
Ordinary alignment-task storage is unchanged. Recent evaluations reads only these
saved task keys, with pagination and at most four concurrent status requests.
Removing a browser entry does not cancel or delete its server task.

Mail and copied links use `/#/benchmark/runs/:id?key=...`, keeping the key inside
the route fragment. The page verifies the key before saving it or fetching results.
Successful storage removes the key from the address bar while preserving filters.
If storage is blocked, the key stays in the URL and the page offers a copyable
link and downloadable recovery JSON. A wrong incoming key cannot replace a valid
saved key. The same verification applies to imported files and pasted result links.

There is no mailbox-search or email-code interface. Optional email delivery is
handled by the backend's submission and terminal notification records. If delivery
is unavailable, the email field says so and is disabled; repository-only submission
still works. Only the recipient supplied by the user is sent to the backend.

## Results

Finished evaluations now open the candidate-versus-six-method comparison first.
The original single-method view remains under **My results**. See
[User comparisons and the MSA-Kit example](BENCHMARK_USER_COMPARISON.md) for the
comparison contract, fixed-snapshot downloads and instant public example.

The scientific v3 result contract is unchanged. The single-method table displays
time, peak memory, normalized SP, Q and TC with neutral styling. Dataset details
prefer Q where available and normalized SP otherwise, and keep five independent
metric plots. Downloads retain all seven original metrics and units.

Method source links point to the pinned commit. Private results remain separate
from the six-method public snapshot. The old `/benchmark/mine` URL redirects to
`/benchmark/recent`.

## Verification

Use the supported Node 24.21 runtime:

```bash
node node_modules/vitest/vitest.mjs run src/features/benchmark/private.test.tsx --environment jsdom
node scripts/build-production.mjs
node node_modules/@playwright/test/cli.js test --config playwright.benchmark-private.config.ts
```

The module and browser tests cover direct submission, optional email, advanced
settings, lost responses, storage failure, refresh and imported recovery,
changed or invalid keys, cancellation, progress polling, table/plot values,
all seven metrics in downloaded JSON/CSV, Chinese, mobile, keyboard focus and
200% text. Browser fixture results are synthetic test inputs only and never enter
the published public snapshot. Actual server execution and real-result consistency
are verified separately through the new anonymous flow.

The production build uses `/` and `https://api.easymsa.cn/api`. Evidence for this
change is stored under `D:\code\easymsa-anonymous-frontend-20261101`.

Verified on 2026-11-01: all 114 frontend test files / 829 tests passed. The
anonymous submission module has 34 passing tests. All 24 anonymous browser
scenarios passed on desktop and mobile, and all 42 existing public Benchmark
browser scenarios passed. Type checking and the production build passed using
Node 24.21.0. The first full run exposed an asynchronous URL-replacement assertion;
it now waits for the router update, and the complete rerun passed.

Evidence files are `full-unit-delivery.log`, `focused-delivery.log`,
`browser-delivery.log`, `public-browser.log` and `build-delivery.log`.

A later retry review found that changing the page language after a lost first
response could otherwise create a new submission identifier. The active draft
now retains its exact request and identifier as soon as sending begins. The
focused suite passed **36** tests, including same-page language changes and
immediate recovery while new dispatch is paused. Type checking and the updated
production build passed. The complete **24-scenario** desktop/mobile browser
suite passed again, including the strengthened language-retry regression.
Evidence is in `focused-retry-language.log`, `build-retry-language.log`,
`browser-retry-language.log` and `browser-retry-delivery.log`.

The progress line always shows processed datasets. It shows valid alignments
only after the result report is available, counting dataset rows with a valid
repeat. A scoring failure therefore keeps its valid alignment. The subsequent
focused suite passed **38** tests, including a 26-row report with 24 complete,
one partial and one timeout: the page shows 25 valid alignments even when the
engine's fully-successful-unit count is 24. Type checking and the final
production build passed. Evidence is `focused-valid-alignments.log` and
`build-valid-alignments.log`.
