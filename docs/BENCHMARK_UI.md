# Benchmark reading experience

The October 30, 2026 Comparison Studio interface shows **latest records → a dataset's speed/quality
trade-off → individual metrics or exact values**. The selected visual direction
uses a white workspace, a pale green dataset sidebar and the site's shared
green accent (`--color-accent`, currently `#0f766e`).
Benchmark remains accessible from About and direct
URLs, without a primary-navigation item. No experiment is rerun by this UI.

## Comparison Studio layout

The dataset sidebar groups the actual 20 DNA and six RNA datasets. Search shares
the existing URL/filter state; links retain batch, method and chart selections.
Lengths, sequence counts and source similarity labels come from the catalog.
The sidebar's method count follows the current selection. On desktop it remains
below the measured sticky header; below 1024 px it becomes an expandable dataset
menu. Simulation detail subtitles retain their source labels so that mobile
users can distinguish cases while the dataset menu is closed.

Details use a readable view title and a compact dataset subtitle. The scatter
plot and its method/resource/quality list form one comparison area. Axis controls
sit below the plot; the explicit Q/TC zoom switch sits beside the quality caption.
Exact values, individual metrics, source conditions and downloads remain available.
Single-source legends are shown once in the chart footer, while mixed-source
method rows retain their source labels. Public data and scientific selection
rules were not changed to match illustrative values in the design reference.

Text sizes respond to enlarged text. Resource tick labels use their actual
positions to avoid collisions; roomy logarithmic axes display each decade.
These presentation choices never change point coordinates, scores or exports.

## Result selection and source identity

The website catalog displays seven methods. `website.ts` projects the validated
archive once, before page selection: HAlign 4 is named **HAlign**, while HAlign 3
and Kalign 3 are excluded from method catalogs, batch specifications and records.
The same projection feeds the overview, all detail views, filters, counts and
CSV/JSON downloads, including full-batch downloads. Old URL filters and Show full
catalog cannot restore excluded methods. The historical `halign4` identifier,
versions, commands and numerical measurements remain unchanged for provenance.
`public/benchmark/snapshot.json` remains the complete, unmodified nine-method
archive; the website projection is not a new experiment or a new HAlign version.

The latest website view has 182 pairs: 127 complete, 21 timed out and 34 OOM.
RNA has 42 pairs: 30 complete, 11 timed out and one OOM. Source counts are 134
baseline, 11 adapter repair and 37 memory retry. Historical website views have
182, 11 and 37 records; all original experiment records remain in the archive.

An unqualified `/#/benchmark` URL opens **Latest records**. An existing `batch`
query opens that named batch; `scope=latest` explicitly chooses the latest view.
`selection.ts` filters to the current catalog/data version, sorts batch timestamps
newest first and breaks equal timestamps by descending batch ID. It selects the
whole record for each dataset/method pair. A newer failure replaces an older
success; unavailable metrics are never filled from older records.

Each row carries its original batch, method version, parameters and resource
limits. Current source labels are Baseline · 16 GiB, Adapter repair · 16 GiB and
Memory retry · 32 GiB. Full IDs and conditions remain in disclosure sections and
exact details. This derived view is not a newly executed or uniformly controlled
experiment. It has no recommendation, automatic conclusion, composite score,
cross-dataset ranking or cross-batch speedup.

## Overview matrix

Time is the default metric; time, peak memory, SP, Q and TC have direct controls.
Avg SP and Scaled SP are under More metrics. Methods keep catalog order. Dataset
rows are grouped as 16S, mitochondrial samples, mitochondrial simulations and
RNA, ordered by sequence count or source similarity label. Similarity labels are
source metadata, not newly measured identities.

In Latest records, cells use neutral backgrounds with exact source badges for
retested records. Unmarked records are baseline records. In a named batch only,
darker green indicates a better value within one dataset: logarithmic resource
normalization for positive values and linear normalization for other metrics.
Ties share a color; a singleton or all-equal row is neutral. Failed or unavailable
values are never zero and never participate in color normalization.

Search, type, method and advanced filters reduce the displayed scope. Summary
counts use actual selected records as the denominator; the whole selected scope
is stated separately. Named sparse batches initially show their included dataset
and method catalogs. Show full catalog reveals excluded pairs as Outside this
batch, distinct from included-but-not-run records. Failed records stay visible.

The matrix has sticky method headers and dataset names, and a local horizontal
scroll area. Hover/focus/tap reveals precision, version, repetitions and source.
Opening a cell carries the selected metric/method and filters to the dataset.
Returning restores the overview query and saved scroll position.

## Dataset comparison views

Three tabs share one result selection and preserve selected methods:

1. **Trade-off** (default): time or memory on the horizontal axis; Q, TC, SP,
   Avg SP or Scaled SP on the vertical axis. A referenced dataset defaults to
   time–Q; a dataset without reference defaults to time–SP and disables Q/TC.
2. **Metric plots**: aligned time, memory, SP-family, Q and TC dot plots. At
   >=1280 px, method rows are shared; at medium widths, two columns each retain
   method names. Below 768 px, one metric is shown with only relevant controls.
3. **Exact values**: all seven metrics, status, valid/planned repeats, method
   version and the row's original batch/resource condition.

The trade-off chart draws a method only when both selected measurements exist.
Every selected method remains in the adjacent status list, including failures or
missing measurements. Source batches use circle, square and triangle markers
along with source labels. Labels may move to avoid overlap; the actual point
coordinates never move. Coincident points can be selected independently from
the method list. Desktop puts chart and list side by side; mobile stacks them.

Time uses seconds and memory uses GNU time maximum RSS in MiB. Positive resource
axes default to logarithmic scales, with an explicit linear choice. A zero or
non-positive statistical extent triggers a labeled linear fallback, without an
invented offset. SP-family axes are linear, support negative values, and state
that SP is a pairwise score rather than reference accuracy. Q/TC default to 0–1;
explicit zoom shows the local range with true endpoints. Scale changes never
change the record or export. Single observations have no uncertainty bars; future
reported mean/SD or mean/range records use only the statistics in the report.

## URL and navigation

The URL retains `scope`/`batch`, `all`, `metric`, `methods`, `search`, `type`,
`source`, `reference`, `min` and `max`. Dataset views additionally retain `chart`,
`x`, `y`, `scale`, `zoom`, and a selected `method`; individual plots use `sp`,
`timeScale`, `memoryScale` and `plotZoom`. Previous/Next follows the currently
filtered dataset catalog. Switching charts or highlighting methods does not
change the download range. Old explicit-batch links still use their batch.

## Exports and shared values

`selection.ts` resolves whole records; `view.tsx` derives visible datasets,
methods and statistics. `metrics.ts` centralizes metric names, units, precision,
axes and metric rows. Matrix, trade-off, metric plots, table and tooltips use
those rows. The public v2 schema and original snapshot remain unchanged.

The download menu offers Current filters and All latest records in latest mode,
or Current filters and Full batch in named-batch mode. Detail exports contain
only that dataset and the selected methods. Full-scope downloads ignore display
filters. Both formats retain all seven metrics in their original public units
(KiB for memory) and precision. Latest JSON keeps selected records in their
original source batches, including original version/parameter/condition metadata;
CSV retains source identity, version and resource columns on each row. Excluded
combinations are not fabricated as failures or zero scores.

## Accessibility and verification

The same information is available in Chinese and English. Controls have visible
focus and at least 44 px interaction height. Text and source markers accompany
color; precise details work with pointer, keyboard and touch. Escape closes
result details. The page itself fits the viewport at 200% text; the matrix and
wide tables scroll locally. Filter panels are mutually exclusive and close on
Escape, outside activation or a batch change. Scatter labels receive extra plot
height when enlarged text needs it; a closable popup exposes precise values
immediately on touch. No numeric count-up or axis-morph animations run.

The automated suite independently checks all 182×7 latest website metric records against
the immutable snapshot, including coordinates, source IDs, exact cells and real
CSV/JSON downloads. It covers retained historical batches, RNA/method filtering,
new-failure-over-old-success, sparse scope, zero/negative values, no reference,
single/coincident points, all failures and partial multi-repeat records. Scores
in test fixtures are intercepted in tests and never enter published resources.

See [executed verification and reproduction commands](BENCHMARK_READING.md).
