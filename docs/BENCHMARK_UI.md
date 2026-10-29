# Benchmark visual explorer

The October 28, 2026 revision puts real results first: a dataset-by-method
matrix on the overview and aligned dot plots on each dataset detail. The
existing EasyMSA teal identity, open sections and thin rules remain. There
are no charting-library, font-service or image dependencies.

## Reading the overview

The default metric is time. Time, peak memory, SP, Q and TC have direct controls;
Avg SP and Scaled SP are available under More metrics. Methods keep their fixed
catalog order. Datasets are grouped into 16S, mitochondrial samples,
mitochondrial simulations and RNA, then ordered by sequence count or source
similarity label. The labels are source metadata, not newly measured identities.

Each cell displays the actual reported value. Darker color means a more favorable
value **within that dataset only**. Time and memory use a logarithmic transform
before row normalization when all valid values are positive; other metrics use a
linear transform. Equal values share a color. A single available value or an
all-equal row stays neutral. Color is a display aid, not a scientific score or
cross-dataset ranking. Failure states do not participate in normalization.

The matrix has a sticky header and dataset column and scrolls locally. Search,
filters, metric and batch are preserved in the URL. Opening a cell carries the
method and metric into the detail page. Returning restores the overview URL,
page position and matrix scroll position. Exact values, versions, coverage and
reasons are available on hover/focus; Escape dismisses the tooltip.

## Reading dataset plots

At >=1280 px the five plots share method rows. At 768–1279 px they use two
columns with method labels in each plot. Below 768 px, metric controls expose
one full nine-method plot at a time. Missing methods retain their rows.

- Time is seconds; memory is GNU time maximum RSS in **MiB**. Positive resources
  default to logarithmic axes with real-unit ticks; a linear option is available.
  Zero or non-positive statistical extents trigger a labeled linear fallback.
- SP is the original pairwise score, **not accuracy**. Its dataset-local linear
  axis supports negative scores. The SP selector explicitly renames the plot
  when showing Avg SP or Scaled SP.
- Q and TC default to fixed [0,1] axes. The explicit zoom control shows a
  labeled local domain with visible endpoints; it does not change any score.
- Single observations have no uncertainty whiskers. Reported mean/SD or
  mean/range displays draw only their existing reported statistics.
- Hover, keyboard focus or tap highlights the same method across plots and opens
  a precise result description. Memory descriptions include original KiB.
- Exact values switches to all seven metrics, statuses and repeat counts.
  Provenance, preprocessing, versions and parameters remain in disclosure areas.

A timeout is shown as a timeout even if the underlying unavailable metric has a
more generic execution-failed code. No-reference applies to Q/TC only. A timeout
limit is not substituted for measured time, nor a memory limit for measured RSS.

## Shared values and exports

`metrics.ts` defines metric names, directions, units, scales, row-color rules and
record selection. `presentation.tsx` formats common states and serializes exports.
All views join on batch/dataset/method identity. Single values and report means
are read using `value ?? mean` for available metrics.

The Download data menu distinguishes Current filters and Full batch. Detail
exports contain the current dataset. Both formats retain all seven metrics,
original precision and raw public units (**KiB** for memory). JSON and CSV use the
same selected snapshot. Display-only MiB conversion, colors and coordinates are
never written back into report values or scientific scores.

## Targeted repair batches

A published batch may select only some method/dataset pairs. The overview shows
the actual number of included pairs and the unique dataset/method coverage, while
the dataset catalog remains available. An absent pair is labeled **Outside this
batch**, has no value, no heat color and no valid/planned repetition count. An
explicit `not_run` result remains distinct: it was included but not evaluated.

The selected batch persists across dataset navigation even when the next dataset
has no included pair. The detail page then shows zero included methods instead
of silently falling back to an earlier batch. Users can select the original batch
to inspect its unchanged observations. Values are never filled from another batch.

JSON and CSV downloads contain only the selected batch's recorded pairs; absent
pairs are not fabricated as failed or zero-valued rows. Download menus show both
the metadata dataset count and the actual pair count. The repair browser test
checks the exact 15-pair target list, all 105 report metric records, excluded cells,
all included dataset charts/tables/downloads, an excluded dataset and the retained
original 234 observations.

## Navigation and accessibility

Benchmark remains linked from About, not primary navigation. Both languages use
the same layout. Controls have visible focus and at least 44 px interaction
height. States include text, not color alone. Matrix min-width follows rem units
so enlarged text expands the internal scrolling area rather than crossing cells.
The page itself must fit the viewport. Reduced-motion preferences are respected;
there are no numerical count-up or axis-morph animations.

## Verification

Run the focused unit suite, build and browser matrix from the frontend root:

```powershell
node node_modules/vitest/vitest.mjs run src/features/benchmark src/lib/benchmarkCatalog.test.ts src/lib/benchmarkContractParity.test.ts --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism
node scripts/build-benchmark.mjs
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\code\.playwright-browsers'
node node_modules/@playwright/test/cli.js test --config playwright.benchmark.config.ts
```

The browser tests independently compare all 26×9×7 records against the actual
published snapshot: matrix values/colors, exact cells, dot coordinates, JSON and
all CSV fields. They also exercise negative SP, zero, missing/no-reference,
partial results, reported SD/ranges, filtered exports, both languages, mobile
metric switching, keyboard access, zoom and enlarged text. Fixture scores stay
in tests and never enter published assets. See BENCHMARK_VERIFICATION.md for
executed results and the unchanged snapshot hash.
