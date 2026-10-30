# Six-method website catalog

The website excludes T-Coffee in addition to HAlign 3 and Kalign 3. Its six
methods are Clustal Omega, MAFFT, MUSCLE 5, HAlign, FMAlign2 and minipoa.
This updates the preceding seven-method green-theme iteration.

The website projection applies to the matrix, charts, tables, filters, summaries,
batch method metadata and CSV/JSON downloads. Historical measurements remain
unchanged in the archived snapshot. No experiment was repeated.

Latest records contain 156 pairs: 127 complete, 14 timeouts and 15 memory-limit
failures. Sources are 128 baseline, 11 adapter-repair and 17 memory-retry records.
RNA contains 36 pairs: 30 complete and six timeouts. The filtered historical
batches contain 156, 11 and 17 records respectively.

The six-method regression expectations independently check 1,092 latest metric
records and retain coverage of partial results by assigning synthetic partial
measurements to a displayed method. Old URLs cannot restore excluded methods.
Evidence is saved in `D:\code\easymsa-green-20261030\remove-tcoffee-*.log`.

Validation: 146 Benchmark unit tests and the production build passed. Twelve
desktop/mobile browser scenarios passed after migration, including all 1,092
latest metrics and actual downloads. The initial broad run was stopped after
unbounded screenshot-animation waits; those waits are now bounded. The focused
run passed ten scenarios; two memory-tooltip checks initially selected a method
outside that batch. They now use the retained MUSCLE 5 / DNA MT 100 OOM record,
and both passed on rerun. No production data or failure statuses were changed.
