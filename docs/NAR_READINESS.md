# NAR website readiness update — 2026-10-03

This update includes the reviewed website features and concise bilingual copy. Pushes to main run validation and publish GitHub Pages; release.json identifies the deployed commit.

## Local review

- Start the established local development entrypoint; visit `http://localhost:5173/easymsa/`.
- Examples: `#/examples` and `#/examples/realignment-small`.
- Original-code MIT license and third-party exceptions: `#/license`.
- Privacy, retention and selective browser storage controls: `#/privacy`.
- Workflows: `#/docs`; method origins and original papers: `#/about`.

The production API remains `https://api.easymsa.cn/api`; production keeps the `/easymsa/` base path. No DNS, server algorithm, queue, database or retention change is included.

## Public examples

The examples are newly generated synthetic teaching DNA (seed 20261002), with 20 sequences of approximately 500 nt. They are not biological case studies or scientific accuracy/performance benchmarks. MiniPOA 1.0 generated the initial alignment (515 columns); ReAlign-N 01a602e-easymsa.1, local then global, generated a 510-column refined alignment. A difference in columns is not evidence of improved accuracy.

Versioned assets are in `public/examples/v1/`. Each example has FASTA input, stage FASTA/gzip/gzip+xz, a whitelist ZIP, summary/preview JSON, ID mapping, source/parameter/timing records and SHA-256 hashes. The toolchain snapshot records deployed executable hashes. Ordinary preprocessing assigns normalized IDs; validation compares against the actual clean FASTA and original-to-clean mapping. Standalone refinement preserves its aligned input identity. The final refined example resolves to the refined file.

Gzip artifacts are stored with an opaque `.gz.bin` transport suffix to avoid static hosts interpreting gzip as HTTP content encoding. Download links explicitly restore the `.fasta.gz` filename. Browser tests decompress the actual download, not merely check its name.

No API call is needed to retrieve these static results. The site header may still check service health. A failed API does not block example interaction or static downloads. Example pages do not save task credentials; workspaces and export provenance identify them as public examples. Cache/workspace isolation includes example ID, version and stage.

Use “Use this data in a new job” to load the corresponding form, or its “Load example file” button. Loading changes the example settings, retains an existing email value and never submits automatically. Ordinary examples load MiniPOA/Audit with refinement off; ordinary forms opened normally still default to Auto.

## Reproduction

- `python3 scripts/verify-public-examples.py`: offline hash, FASTA, stage, compression and public ZIP checks; submits no tasks.
- `npm test -- --maxWorkers=2 --minWorkers=2`: unit/scientific/frontend regressions.
- `npm run build`: production type check and build.
- `npx playwright test --config playwright.nar.config.ts`: new NAR pages and existing core viewer regressions across Chromium, Firefox and WebKit. Defaults to local port 5173. Override `EASYMSA_TEST_BASE_URL` for production preview. `EASYMSA_WEBKIT_EXECUTABLE` optionally selects an environment-specific browser wrapper; ordinary installations need no wrapper.
- `python3 scripts/license-inventory.py --resolve-metadata`: dependency license snapshot, including exact-version npm metadata for absent optional platform packages.
- `python3 scripts/prepare-public-examples.py --api http://127.0.0.1:18000/api --ssh-helper /path/to/authorized/remote.py`: submits two real, email-free demo jobs. The SSH helper must accept a local script filename and execute it on the authorized deployment without printing credentials. Clean FASTA is read with the deployment database context, only for the generated teaching input. Review the configured deployment paths before using this on another server. Do not silently overwrite a published example version; create a new version for changed tools/data.

## Requirement mapping

| Item | Local status | Evidence / remaining action |
|---|---|---|
| Free access, including commercial use | Implemented | Home, footer, license page; existing resource limits preserved |
| Homepage standard license link/full text | Implemented | MIT original-code grant with explicit exceptions; both repositories |
| Third-party license/method sources | Implemented | Notice tables, upstream license texts, dependency inventories, About |
| Example input and interactive output | Implemented | Two real-tool static examples, shared result components, downloads |
| Linked English tutorials | Implemented | Three workflows, direct example links, metric interpretation |
| Privacy/browser storage | Implemented | Honest file/database/log/backup distinction; Resend; selective clearing |
| No forced registration/email | Preserved | Real browser submissions use no email |
| Five-year maintenance responsibility | Confirmed by project owner | Institutional arrangement must remain in force |
| Published site uses these changes | Authorized for release | Confirm successful Pages workflow and release.json commit after deployment |
| Auto scientific validation | Still pending | This website work does not validate the selector scientifically |
| Algorithm integrity / Worker crash recovery | Still separate | Known earlier findings require independent fixes/retests |
| Target-scale experiments and biological case studies | Still pending | Synthetic teaching examples do not substitute for these |
| Editor proposal approval | Still pending | Owner confirmed no approval yet |
| Manuscript and long-term archive | Still pending | Prepare independently of this website release |

The checklist follows the approved project plan and [NAR Web Server Issue guidance](https://academic.oup.com/nar/pages/submission_webserver). It is not a claim that all submission or acceptance conditions are met. Source methods are prior laboratory work; the website adds service/workflow capabilities. MAFFT and Mash are external dependencies.
