# Comparison Studio — design QA

The later website update uses the shared green theme and seven methods, with
HAlign 4 displayed as HAlign and HAlign 3/Kalign 3 excluded. Current behavior,
counts and verification are recorded in [Benchmark green update](docs/BENCHMARK_GREEN.md).
The blue, nine-method design comparison below records the preceding iteration.

Date: 2026-10-30. Scope: existing EasyMSA Benchmark routes, local preview only.

## Visual truth and normalized evidence

- Source visual truth: `D:\code\easymsa-visual-directions-20261030\02-comparison-studio.png`.
- Implementation: `http://127.0.0.1:5208/#/benchmark/datasets/rna_255?scope=latest&zoom=1&method=mafft`.
- Implementation screenshot: `D:\code\easymsa-studio-20261030\qa-accepted-reference1487-rna255-zh.png`.
- Source pixels: 1487 × 1058. Implementation pixels: 1487 × 1058.
- CSS viewport: 1487 × 1058; deviceScaleFactor: 1. No device frame, browser chrome,
  resampling or density conversion was needed.
- State: Chinese, light theme, RNA 255, latest records, time/Q scatter, explicitly
  zoomed Q and selected MAFFT. The implementation capture leaves the precision
  popup closed; the source includes a small illustrative popup. Its extra
  scientific precision/details remain available on focus or activation.
- Additional evidence: `qa-accepted-desktop1440-overview-zh.png`,
  `qa-accepted-mobile390-rna255-zh.png` and the corresponding `-full.png` files
  in the same evidence directory.

The source and implementation images were opened together in one comparison
input at equal pixel dimensions, including the post-fix capture above. Full-view
comparison covered composition, sidebar/main proportions, hierarchy and density.
At native size the header, sidebar entries, axis controls and method list were
readable, so separate resized crops were not needed. Those four regions were
examined directly in the same full-resolution comparison. Additional real mobile
and enlarged-text screenshots checked details absent from the static source.

## Fidelity surfaces

- **Typography:** retains the application's system sans-serif family and Chinese
  fallback. The heading is 2.5 rem/700 on desktop and 2 rem on mobile, with
  understated body text and tabular numbers. Small controls use ordinary weights;
  selected rows/tabs use stronger weight. Text sizes use rem to respond to text
  enlargement. Method names and original values remain readable without hover.
- **Spacing/layout:** a 236 px pale sidebar and 32 px desktop main gutters recreate
  the selected two-area composition. The chart and 300 px method list align;
  axis controls are below the plot. The existing method filter remains in the
  tab row. No extra cards, decorative shadows or large hero block were added.
  Below 1024 px the sidebar becomes a disclosure; narrow charts stack the list.
- **Color/tokens:** white main surface, `#eff5fc` sidebar, `#245be8` accent, dark
  blue text and fine `#e2e9f3` rules. Active rows use pale blue; unavailable states
  use restrained ochre plus text. Named-batch heat shades use the same blue
  family; latest records remain neutral across differing conditions.
- **Images/assets/icons:** the existing EasyMSA logo and installed icon set are
  reused. No generated wallpaper, substitute logo, decorative CSS illustration
  or new font/image dependency was introduced. The chart remains a real data
  visualization, not a screenshot of the proposed design.
- **Copy/content:** readable titles replace raw IDs as the main heading. Actual
  dataset identity remains in the subtitle/sidebar/provenance; simulated cases
  explicitly retain source labels. The design's illustrative “16 DNA” and
  incorrect RNA lengths were replaced with the real 20 DNA and actual lengths.
  Full provenance, failures, exact values and export scope remain available.

## Findings and comparison history

1. **[P2, fixed] Initial vertical spacing and switch geometry.** The first
   implementation included an empty 32 px work-return spacer, and a shared
   checkbox rule shrank the Q/TC switch to 16 px. This displaced the main plot
   and clipped its thumb. The empty spacer is now hidden only on Benchmark;
   actual return links stay available. The switch has explicit 36 × 20 px bounds.
   Post-fix evidence: `qa-accepted-reference1487-rna255-zh.png`.
2. **[P2, fixed] Low-contrast secondary text.** First accessibility inspection
   found the back link, matrix IDs, adjacent links and active sidebar metadata
   below the intended contrast. Their foreground tokens were darkened while
   retaining the pale visual hierarchy. `accessibility-audit-final.json` covers
   17 real views including Chinese, English, mobile and historical heat cells.
3. **[P2, fixed] Sidebar identity and scrolling.** Its original top offset ignored
   the sticky header. A ResizeObserver now uses the actual header height. The
   sidebar still releases normally at the page footer. Filtered method counts
   now match the comparison scope, and simulation subtitles retain source labels
   so mobile cases remain distinguishable with the sidebar closed.
4. **[P2, fixed] Resource-axis tick collisions.** Mobile `1,000`/`10,000` labels
   overlapped while the wide chart omitted useful decades. Tick selection now
   measures their positions, keeps endpoints and removes colliding interior
   ticks. The wide post-fix capture shows every decade without changing domains.
5. **[P2, fixed] Initial enlarged-text label placement.** One mobile rendering
   used 13 px label boxes for 26 px text until the observer callback. Layout
   measurement now runs before paint and when the adaptive gutter changes.
   Existing strict label-overlap checks remain in place.
6. **[P2, fixed; final browser recheck recorded below] Enlarged zoom-axis endpoints.** A first adaptive
   gutter correction fixed the original 32.75 px offscreen labels. The final
   375 px mobile regression still found an endpoint 11.75 px offscreen after
   toggling zoom at 200% text. The cause was a global reduced-motion rule setting
   a nonzero transition duration: the new inline 127 px gutter was briefly
   rendered as 79 px. Chart geometry now explicitly disables transitions.
   The exact Pixel 5 / 375 × 812 / 200% text / full-page capture / zoom sequence
   passed three repeated zoom activations with a 36.25 px left margin and zero
   geometry animations. The final built regression run verifies the same case.

The initial full browser run had 32 passing cases, four assertion failures and two timeouts. Search-label
and zoom-caption checks were migrated to the new accessible controls without
relaxing data assertions; actual contrast defects were fixed. Targeted reruns
are retained separately rather than hiding earlier failures. No raw numeric,
source-selection or download oracle was changed to fit the visual output.

## Expected differences and P3 polish

- Exact dynamic axis endpoints and numeric formatting come from the current
  scientific display rules; they are not replaced by illustrative raster labels.
- Nine methods, method filtering, axis scaling and full source inspection exceed
  the static mock's visible controls but preserve the requested functionality.
- The original global header/footer remain; a generated source credit is not app
  content. Q/TC zoom remains opt-in instead of becoming the default globally.
- A precise tooltip carries more detail than the source illustration. The base
  layout stays clear while that information is closed.

## Implementation checklist

- [x] Implement selected white/pale-blue/cobalt visual direction.
- [x] Preserve real snapshot and three original batches.
- [x] Keep search, filters, previous/next, views and actual downloads.
- [x] Compare source and real render together at matching dimensions.
- [x] Check Chinese/English, keyboard, mobile and enlarged text.
- [x] Close the final enlarged zoom-label finding with browser evidence.

The final built responsive/enlarged-text rerun passed **4/4** on port 5218;
`D:\code\easymsa-studio-20261030\attempt-5-results.json` preserves the result.
The strict endpoint bounds check was not relaxed. The accepted Chinese/English overview/detail captures recorded zero console errors, page errors or failed requests across 12 views. The served assets match the accepted build. No actionable P0/P1/P2 finding
remains. Exact scientific-value and download checks are documented in
[the executed verification record](docs/BENCHMARK_STUDIO.md).

final result: passed
