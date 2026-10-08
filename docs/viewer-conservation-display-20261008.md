# Conservation display

The viewer defaults to a linear **80–100%** conservation display, highlighting small differences among similar nucleotide sequences. The axis endpoints are visible beside the track.

Open **View → Quality analysis → Conservation display** to switch to the full **0–100%** scale. In the expanded range, columns below 80% use an amber marker. Hover text reports the original percentage. Columns with no informative bases remain blank.

This changes display geometry only. The `nucleotide-v2` metric, analysis scope, QC thresholds and column values remain unchanged. SVG and PNG follow the selected scale; export metadata records the range, while `columns.tsv` retains original values.

The choice is saved with each workspace. Earlier workspaces default to the expanded range; resetting the view restores this default.

## Validation — 2026-10-08

- Related unit/component/persistence/export checks: 60 passed.
- Chromium, Firefox and WebKit: 6 interaction checks passed.
- Production build passed.
- Checked 1440×900 Chinese layout, scale labels and original percentage tooltips.
- Covered lower-range markers, all-gap/ambiguous columns, switching, refresh recovery, and SVG/PNG geometry.
