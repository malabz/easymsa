# Third-party software, methods and exceptions

Recorded 2026-10-02. The root MIT license covers authorized original EasyMSA code and documentation, not the components below. Original notices remain in their distributions. Online service access is free for all uses; this does not change software redistribution terms.

## Deployed methods

| Component | Deployed version | Role | Principal license | Source and citation |
|---|---|---|---|---|
| MiniPOA | 1.0 | Alignment, prior laboratory work | MIT; Copyright 2025 Haodong Liu | [Source](https://github.com/NCl3-lhd/minipoa), [paper](https://doi.org/10.1101/gr.282046.126) |
| HAlign4 | 2.0.0 | Alignment, prior laboratory work | MIT | [Source](https://github.com/malabz/HAlign-4), [paper](https://doi.org/10.1093/bioinformatics/btae718) |
| FMAlign2 | 2.0.0 | Alignment, website uses MAFFT backend; prior laboratory work | Apache-2.0 | [Source](https://github.com/malabz/FMAlign2), [paper](https://doi.org/10.1093/bioinformatics/btae014) |
| ReAlign-N | 01a602e-easymsa.1 | Optional refinement, prior laboratory work | GPL v3, including derivative patches | [Source](https://github.com/malabz/ReAlign-N/tree/01a602eab1dde923c130351c18fb1671aa6480e6), [paper](https://doi.org/10.1093/nargab/lqae170) |
| MAFFT | 7.526 | External alignment and FMAlign2/ReAlign-N dependency | BSD-style upstream license; retain component notices | [Source and license](https://mafft.cbrc.jp/alignment/software/), [paper](https://doi.org/10.1093/molbev/mst010) |
| Mash | 2.3 | External distance estimation | BSD-3-Clause core; bundled KSeq MIT, MurmurHash3 public domain, Open Bloom Filter Common Public License, robin-hood hashing MIT | [Source/license](https://github.com/marbl/Mash/blob/v2.3/LICENSE.txt), [paper](https://doi.org/10.1186/s13059-016-0997-x) |

Public copies of upstream principal texts are in `public/legal/*-LICENSE.txt`. These are an index and notice snapshot, not a relicensing grant. ReAlign-N patch source, build instructions, GPL and global module license are preserved in the backend's `tools/realign-n/`. Consult the exact source distribution when redistributing an algorithm binary and its libraries.

## Website dependencies

`public/legal/frontend-dependencies.json` records all lockfile dependency entries, versions, development-only status, declared licenses and available installed root license/notice texts. Regenerate with `python3 scripts/license-inventory.py --resolve-metadata`. Missing metadata is explicitly `NOASSERTION`, not an MIT assumption. This inventory includes React, React Router, TanStack, lucide-react icons, fflate, form/schema utilities and build/test dependencies.

`public/legal/backend-dependencies.json` records the installed server Python environment with versions, declared licenses and dist-info notices. The backend copy is `DEPENDENCY-LICENSES.json`. This includes FastAPI, Starlette, Uvicorn, SQLAlchemy, psycopg, Redis/RQ clients, Resend and transitive runtime dependencies. No protected environment configuration is included.

DejaVu test fonts retain Bitstream Vera notices and public-domain DejaVu changes; see `e2e/fonts/LICENSE.txt` and `public/legal/test-font-license.txt`. The website uses system fonts; no third-party font request or tracking SDK is added.

## Infrastructure and embedded code

PostgreSQL 16 uses the PostgreSQL License; Redis 7.4.11 is dual-licensed under RSALv2 / SSPLv1, as verified against the running container and upstream versioned license; it is not covered by MIT. Nginx uses its BSD-style license. Python and system/Conda runtime libraries retain their distribution notices; they are not included in the frontend or relicensed by this repository. See [PostgreSQL](https://www.postgresql.org/about/licence/), [Redis 7.4.11](https://github.com/redis/redis/blob/7.4.11/LICENSE.txt), and [Nginx](https://nginx.org/LICENSE).

The backend's vendored adaptive selector and models retain their recorded provenance and existing rights (`easymsa_server/_vendor/README.md`, `SELECTOR_SOURCE_SHA256.txt`). This change does not apply MIT to vendor directories or independently released algorithm code. EasyMSA-prep is a separate tool with its own project notices; it is not relicensed here.

## User data and attribution

Uploaded data does not become open data. Only the explicitly published, newly generated synthetic teaching examples are included in the MIT materials grant. Academic citations are requested separately from license obligations. EasyMSA has no verified paper DOI to cite at this time.
