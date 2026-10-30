# Unified Benchmark view

The RNA classification and E-style score labels below are superseded by
[verified CIPRES identity and localized score units](BENCHMARK_RNA_AND_SCORES.md).

The public page presents one current result for each dataset/method pair. There
is no batch selector, retry badge, source column or source-shape legend. Old
URLs containing a batch parameter open the same current view. Method and dataset
filters still control tables, charts and downloads together.

Selection uses the existing whole-observation rule: latest record by time and
stable batch ID, including failures. Original observations, resource conditions
and report IDs remain in the snapshot, downloads and folded experiment details.
No data version, score, measurement or historical report is rewritten.

Dataset navigation remembers its own scroll offset across route remounts and
keeps the selected link within the visible navigation area. Desktop and mobile
positions are stored separately. Opening the mobile dataset menu reveals its
selected item without scrolling the main document.

Simulation names include `相似度` / `Similarity` before the percentage, retaining
the source parameter. RNA detail pages show **Source: WMSA2**, linking to the
corresponding RNA-255/511/1023/2047/4095/8191 ZIP URL already recorded in the
frozen catalog. This identifies the distributing project; generation method
remains unconfirmed in the original metadata.

Nonzero SP axis labels use E notation (for example `2.302E8`, `1.5E8`, `-1.5E3`).
Zero stays `0`. Adjacent ticks gain precision when needed to remain distinct;
exact table/tooltips and export precision are unchanged.

Browser coverage now checks unified views for historical links instead of the
removed batch-selection UI. Archive isolation continues to be tested at the
selection/export layer. Added cases exercise sidebar navigation, reload/back,
mobile reopening, six RNA source links and SP ticks. Evidence is saved under
`D:\code\easymsa-copy-20261030\unified-*`.

Validated on 2026-10-30: 113 unit-test files / 782 tests passed; 36 desktop/mobile
browser scenarios passed without skips, including all 1,092 current metrics and
actual CSV/JSON downloads. TypeScript and the local-preview production build
passed. The public snapshot SHA-256 remains
`D2AFE9700E9789E26C4D8122DDB8C93E9F089A0935E2DA5469CF047C617059E4`.
