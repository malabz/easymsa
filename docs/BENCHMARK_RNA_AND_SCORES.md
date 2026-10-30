# RNA dataset identity and readable score scales

## RNA: CIPRES simulation data

The six published RNA cases (255, 511, 1,023, 2,047, 4,095 and 8,191 sequences)
are **simulated RNA**, identified in the WMSA 2 paper as **CIPRES simulation data**.
WMSA 2 distributes these datasets; it is not the biological dataset name.

Primary evidence checked on 2026-10-30:

- [WMSA 2 paper, Results and Discussion, Table 1](https://doi.org/10.1093/bib/bbad190):
  the experimental-data description identifies the simulated RNA series as
  CIPRES and gives the 255–8,191 sequence range.
- [WMSA2 repository, Data](https://github.com/malabz/WMSA2#data): all six names and
  ZIP links appear together under the simulated RNA downloads.
- Those ZIP URLs match the source entries in this project's frozen catalog:
  `http://lab.malab.cn/soft/WMSA2/data/RNA-{255,511,1023,2047,4095,8191}.zip`.

`provenance.ts` identifies these six catalog entries by dataset ID, source ID,
sequence type and count. `websiteSnapshot()` corrects their public presentation
and exported catalog classification to `simulated`. Unknown RNA datasets retain
their existing classification. The underlying archived report and all alignment
measurements stay intact. Source filters therefore include 20 simulated cases:
14 mitochondrial and six RNA cases.

Page headings and navigation say **RNA 模拟 / Simulated RNA**. RNA details show
**CIPRES 模拟 RNA / CIPRES simulated RNA** with the paper link; the original ZIP
links remain in experiment details. The earlier “generation unconfirmed” display
for these six identified cases is superseded by this source verification.

## SP: shared, localized units

Dataset comparison defaults to **Q when any current, selected method has a valid
Q value**, including zero and partial observations. Otherwise it defaults to SP.
An explicit axis choice is respected within the current dataset. Sidebar and
previous/next navigation reset the quality-axis choice so the next dataset uses
its own Q-first default; entering through the SP overview also uses this default.

Score charts use a common unit on each axis. Chinese uses 万 / 亿 / 万亿; English
uses thousand / million / billion / trillion. For example, 150,000,000 and
230,200,000 become tick labels **1.5** and **2.302** under **SP 分数 (亿)**.
Compact table/matrix values include their unit, such as **2.302 亿** or **230.2 m**.
Unabridged tooltips, exact tables, JSON and CSV preserve the original numbers.

Tick labels gain precision when necessary to distinguish nearby values. A shared
divisor affects labels only: point positions, domains, statistics and exported
scientific scores use the existing values. Zero, negative scores, tied values,
no-reference cases and absent measurements retain their original semantics.

Evidence logs and screenshots for this update use the `readable-*` prefix under
`D:\code\easymsa-copy-20261030`.

Validation (2026-10-30): 113 unit-test files / 783 tests passed. TypeScript and
the preview production build passed. The desktop/mobile browser run passed
34 of 36 scenarios; two name expectations still treated every simulated dataset
as a mitochondrial similarity series. After distinguishing simulated RNA in the
independent expectations, all four targeted naming/identity/axis scenarios
passed. No scenarios were skipped. The full metric and actual CSV/JSON checks
passed for all 156 pairs / 1,092 metrics in both viewports.
