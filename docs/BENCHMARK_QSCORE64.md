# Qscore 64-bit scoring revisions

The original Qscore 2.1 `FastQ()` implementation accumulates reference residue
pairs and correctly aligned residue pairs in 32-bit `unsigned` counters. The
RNA datasets with 4,095 and 8,191 sequences exceed that range. Overflow can
produce either a Q greater than one or an incorrect Q still between zero and
one. Range validation alone cannot detect the latter.

The correction reuses saved, validated alignments. It changes Q only. Alignment
time, peak memory, SP, Avg SP, Scaled SP, TC, method versions, parameters, resource
conditions and dataset identities retain their original values.

## Public revision format

Each source batch receives a separate scoring revision with the suffix
`-qscore64-20261102`. Its records contain the original six other metrics and the
corrected Q. The existing latest-record selector picks the newer complete
observation; tables, charts, emphasis and downloads share that selector.

The original baseline, adapter-repair and memory-retry batches remain in the
snapshot unchanged. The historical-batch selector used by archival tools still
returns those original records; the website keeps its unified current view.
The correction manifest links revision batches to
their sources and identifies the exact alignment and reference files by SHA-256.
The public manifest contains no server paths or internal logs.

The website still displays six methods; retired methods remain in the scientific
archive and are included when their historical Q values require correction.
Single-method private results use the separate task result API.

The published correction manifest is
[`public/benchmark/qscore64-correction.json`](../public/benchmark/qscore64-correction.json).
It contains **13 corrected historical observations**: 11 from the original
baseline and two from the adapter-repair batch. Nine of these observations
belong to the website's six displayed methods. The remaining four are retained
for the archived HAlign 3 and Kalign 3 methods. The memory-retry batch contains
no valid alignments for these two RNA cases and is unchanged.

The corrected scorer is `Qscore 2.1+easymsa.u64.1`; the public scoring identity
is `sp1-mismatch-1-gap-2-0-qscore21-u64-v1`. The preceding SP parameters,
full-reference Q/TC definition and absence of T/U conversion remain in each
revision's scoring label. The new scoring timestamp is distinct from the
source alignment's original batch identity.

## Importing verified scores

The import tool accepts a manifest with these fields:

```json
{
  "schema_version": 1,
  "id": "qscore64-20261102",
  "created_at": "2026-11-02T00:00:00Z",
  "scoring": {
    "id": "sp1-mismatch-1-gap-2-0-qscore21-u64",
    "label": "SP scoring and Qscore 2.1 with 64-bit pair counts"
  },
  "records": []
}
```

The timestamp above illustrates the format. The actual manifest records the
completed rescore time. Each verified record supplies `batch_id`, `method_id`,
`dataset_id`, `previous_q`, `q`, `alignment_sha256` and `reference_sha256`.
`previous_q` must exactly match the original public metric, or be null when
Q was unavailable. No synthetic example scores are published.

```bash
node scripts/apply-qscore-correction.mjs \
  --snapshot public/benchmark/snapshot.json \
  --manifest verified-qscore64-manifest.json \
  --output reviewed-snapshot.json \
  --provenance reviewed-qscore64-correction.json
node --test scripts/apply-qscore-correction.test.mjs
```

The output paths must be new and distinct from the inputs. Review and validate
the resulting public v2 snapshot before publishing it. The tool rejects stale
source values, duplicate revisions, missing input hashes, nonfinite or
out-of-range Q, failed alignments and datasets outside the diagnosed overflow
scope. Its tests also verify recovery of a record whose only failed metric was
Q, while retaining the original number of valid alignments.

## Consistency checks

Validation must compare each revised record to its source, checking all six
unchanged metrics and conditions, then compare the selected corrected Q across
the matrix, scatter plot, component plots, values table and CSV/JSON downloads.
The website's latest view keeps 156 dataset/method combinations and 1,092 raw
metric positions. The original historical batch hash checks remain applicable.

The November 2 validation passed 12 importer tests and 279 Benchmark/contract
unit tests, final TypeScript checks and a production-config build. Desktop
Chromium and mobile Chromium each passed the 26-dataset consistency test,
including 780 displayed metric positions, 1,092 raw metric positions and 28
real JSON plus 28 real CSV downloads. All three original batch hashes remain
unchanged. The built snapshot and correction manifest are byte-identical to
their source assets. This validation record describes the local build;
production deployment is tracked separately.
