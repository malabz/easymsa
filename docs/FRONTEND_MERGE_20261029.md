# Frontend integration — 2026-10-29

The existing Benchmark workspace was saved before integrating the current GitHub main branch.

- Workspace: `D:\code\easymsa-benchmark-20261027`
- Integration branch: `codex/benchmark-merge-20261029`
- Saved local work: `a3de14c` — Benchmark catalog/results, comparison views, About redesign, viewer worker changes and existing test baselines.
- Verified GitHub default branch: `main`.
- Integrated upstream revision: `c6924cc8b7054957e70786681d5a908ff3732023`.
- Remote: `git@github.com:malabz/easymsa.git`.

## Conflict decisions

Six files required explicit resolution:

| File | Integrated behavior |
|---|---|
| `src/components/layout/workspace.css` | Retain the upstream workspace styles and the local page-scrolling submission form, advanced settings, example feedback and mobile action bar. |
| `src/components/submit/SubmitJobForm.tsx` | Combine upstream automatic job names, realignment navigation and readiness indication with local example confirmation/undo, pending-state protection and the full settings summary. |
| `src/lib/homeContent.ts` | Keep the distinction between demonstration methods and actual server selections; include the upstream demo badges. |
| `src/lib/i18n/workspace.ts` | Preserve example/settings translations and add the automatic job-name explanation in both languages. |
| `src/routes/AboutPage.tsx` | Keep the existing About design, publications and sole Benchmark entry. Benchmark is absent from the primary navigation. |
| `src/routes/ExamplesPage.tsx` | Use the upstream example preview/layout and retain canonical MiniPOA naming. |

The upstream task recovery, countdown identity, matrix rendering/scrolling, navigation, result panels and timezone-safe QC export changes are included. Benchmark measurements and public model fields are unchanged.

## Verification

All checks used the merged source and production build. The installed Node runtime is 24.18.0; the repository declares `>=24.21.0 <25`. Dependencies and the system runtime were not changed.

- TypeScript and Vite production build: passed using `node scripts/build-benchmark.mjs`.
- Full unit suite: **108 files, 709 tests passed** using `vitest run src --environment jsdom --maxWorkers=2`.
- Existing routes, submission, task recovery and desktop viewer: **33 Chromium browser tests passed**.
- Mobile viewer: **3 tests passed**, including trusted touch, DOM/Canvas cell selection, pan, explicit range drag, pinch zoom and bottom-sheet focus handling.
- Benchmark desktop and mobile: **18 unique tests have passing observations**. The first functional run passed 15; its three transition-related failures were fixed and checked in a four-test focused run, all passing. No assertion was removed and no accessibility rule was disabled.
- Across those browser groups: **54 unique checks passed**, with no skipped tests. This is not a claim that the entire repository's Firefox, WebKit or visual-snapshot suites were run.
- Public snapshot, built snapshot and the existing HTTP preview at port 5208 have identical SHA-256: `259ce1333680a9911e7451f2b2ae475183da676b5a30ac1db4e2fe194a06f1b5`.
- The public data still contains the original 234-unit batch and the 15-unit repair batch. The separate 32 GiB server experiment is not imported by this frontend merge.
- No unresolved Git conflicts or whitespace errors remain.

## Integration regressions resolved

Upstream renamed the realignment controls. The local submission tests now locate the new accessible labels while retaining their confirmation, undo, settings and request assertions. The mock loader is reset between tests so an unconsumed delayed response cannot leak into a later test.

Upstream also added a page-entry fade and asynchronous language view transitions. Benchmark tests now wait for finite entry animations before measuring contrast and wait for the committed document language before checking the translated mobile menu. Normal motion remains enabled during those checks.

Initial restricted-environment test/build attempts could not access generated temporary modules or Worker files. Those logs were retained, and the checks passed with normal local access. The first browser attempt used Playwright's empty default browser cache; subsequent runs explicitly used the already-installed `D:\code\.playwright-browsers` cache. No browser download was necessary.

Evidence logs, failed-attempt traces and final screenshots are saved in `D:\code\easymsa-merge-20261029`. The merge is a local Git delivery; this operation does not push GitHub changes or deploy the website.
