# Normalized SP throughout the Benchmark UI

The visible metric set is time, peak memory, **Normalized SP / 归一化 SP**, Q and
TC. Normalized SP reads the existing report field `scaled_sp` in every matrix,
scatter plot, metric plot, method list, exact table, tooltip and color comparison.
Raw SP and Avg SP are no longer additional UI choices or table columns.

The frozen scorer implements:

`scaled_sp = total_sp / (N * (N - 1) / 2) / L`

Here N is the aligned sequence count and L is the alignment column count. This is
the mean score per sequence pair per column, not a min/max transformation of the
currently displayed methods. The implementation is documented in the locked
scorer's `src/spscore.h` (score definitions) and `src/spscore.cpp` (result
construction); upstream: [malabz/spscore](https://github.com/malabz/spscore).
The present archive's available normalized scores range from 0.036868 to 0.993242.

Q remains the preferred default when available; its fallback is now normalized
SP. Legacy URLs using `sp_score` or `avg_sp` render `scaled_sp`. An unavailable
normalized value stays unavailable; raw SP is never used as a substitute. Zero,
negative values, partial results and report precision remain supported.

The public v2 snapshot and full-report CSV/JSON retain all seven scientific
fields, including raw SP and Avg SP. The UI's normalized value corresponds
directly to the exported `scaled_sp` record. No scores or source files are
recomputed or overwritten. Report downloads keep their established format;
only the visible selection narrows to five metrics.

Validation checks distinguish 780 visible metric entries (156 pairs × 5) from
1,092 full-report metric entries (156 × 7). The browser oracle continues to
compare all seven exported metrics against the archive, and checks all five
visible metrics, point coordinates, green emphasis and selected download scope.
Legacy aliases, normalization-specific ranking and missing-normalized-value
behavior are tested independently using deliberately different raw/normalized
scores. Evidence files use the `normalized-*` prefix under
`D:\code\easymsa-copy-20261030`.

## Verification completed on 2026-10-30

- Full unit suite: 113 files, 795 tests passed.
- TypeScript checks and production build passed using
  `node scripts/build-benchmark.mjs`.
- Full browser regression: 40 tests passed across desktop and mobile Chromium.
- Additional normalization and legacy-link checks: 2 tests passed, one per
  viewport. The final responsive/200% text checks also passed.
- The browser checks cover all 780 displayed metric entries and all 1,092
  exported metric entries, including reported precision, green emphasis,
  coordinates and CSV/JSON values. Missing normalized scores remain missing.
- The public snapshot's SHA-256 is unchanged:
  `D2AFE9700E9789E26C4D8122DDB8C93E9F089A0935E2DA5469CF047C617059E4`.
- The local production preview contains the updated build. No experiment was
  rerun, and no Git commit, push or production deployment was performed.
