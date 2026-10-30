# Comparison direction and green emphasis

Scatter plots show an upper-left arrow above the plotting area. Its label follows
the active axes: faster / less memory and higher Q, TC or SP. The hint is hidden
when no points can be plotted. Axis scales, Q-first selection and exact point
positions retain their existing behavior.

The overview matrix, exact table and scatter method list share `metricEmphasis()`.
Comparisons use the currently selected methods within one dataset and metric.
Resource values use logarithmic spacing when all valid values are positive;
zero/negative values use linear spacing. Quality values use linear spacing.

Five strengths map to green tones `#f0f6f3`, `#dcece7`, `#b7d9ce`, `#327b6d`,
`#0f766e`. The last two use white text. Exact best values are bold, including ties;
rounding is applied only after comparison. Equal-only, single-value and missing
comparisons stay neutral. Partial valid measurements retain their coverage/state.

Each visible table view has one short legend. Hover and selection outlines leave
the metric backgrounds intact. Colors are presentation metadata, never exported
as scores or written back into the public snapshot.

Checks include all 156 pairs / 1,092 metrics, independent color/coordinate/export
assertions, method filtering, selected/hovered cells, zero and negative values,
partial and failed observations, mobile/desktop layouts, keyboard use, text
enlargement and contrast. Logs and screenshots use the `emphasis-*` prefix in
`D:\code\easymsa-copy-20261030`.

Validation on 2026-10-30: 113 unit-test files / 791 tests passed; TypeScript and
the preview production build passed. All 40 distinct desktop/mobile browser
scenarios were verified. The full run passed 38; two earlier assertions measured
the new padded value container rather than its single-line text. Those checks
now measure text geometry and passed in the focused layout run. The new zoom
check also waits for the existing router-controlled checkbox state; the focused
interaction and final layout checks passed (2/2 and 4/4). No cases were skipped.
Independent assertions covered all 1,092 matrix/table metrics and the scatter
method-list metrics, actual CSV/JSON downloads, filtered comparisons, selected
and hovered tones, direction labels, linear/log axes and quality zoom. The public
snapshot remains byte-for-byte unchanged (SHA-256
`D2AFE9700E9789E26C4D8122DDB8C93E9F089A0935E2DA5469CF047C617059E4`).
