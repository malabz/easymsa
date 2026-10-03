# Dependency audit — 2026-10-03

## Scope and result

The current npm audit was refreshed rather than relying on the earlier GitHub count. Before this release it reported 18 affected package entries: 1 critical, 9 high, 7 moderate and 1 low. After compatible updates it reports 5 high entries, all from one upstream advisory in the Tailwind 3 development dependency chain. `npm audit --omit=dev` reports **0 vulnerabilities**. The deployed Python 3.11 dependency baseline has **0 known vulnerabilities** in pip-audit (41 audited distributions). These are point-in-time advisory checks, not a guarantee against undisclosed issues.

| Area | Change |
|---|---|
| Project runtime / CI | Node.js 24.21.0, pinned by `.nvmrc`; Windows/WSL entrypoint supports `EASYMSA_NODE_BIN` |
| Build and local development | Vite 8.3.2 and React plugin 6.1.1 |
| Tests | Vitest 5.0.3 |
| Browser routing | React Router DOM 7.18.4, preserving Hash routing and existing URLs |
| CSS processing | PostCSS 8.5.28; Tailwind remains 3.4.19 |
| Application framework | React remains 18.3.1 |
| Reproducibility | Direct dependencies and transitive lockfile versions pinned; notice inventory regenerated |

## Retained upstream advisory

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces` through 3.0.3. The five npm entries are `braces`, `micromatch`, `fast-glob`, `chokidar` and `tailwindcss`. At audit time there is no patched braces release within the retained Tailwind 3 chain. npm's proposed Tailwind 4 migration conflicts with this release's explicit scope.

Trigger: an attacker supplies deeply nested **glob patterns** to the build-time matcher. EasyMSA's Tailwind configuration uses two fixed repository patterns (`./index.html`, `./src/**/*.{ts,tsx}`). Uploaded FASTA, task names, descriptions and URLs are not passed to this matcher. GitHub Pages serves the compiled static application; Tailwind and braces are absent from the production dependency graph. The local development server is bound to loopback. Builds use reviewed source configuration and CI jobs have bounded timeouts. Do not add user-configurable build globs or execute unreviewed source in a privileged release job.

Disposition: retain and track this build-tool advisory while staying on Tailwind 3; there is no exposed application/runtime path identified in this review. Recheck the upstream advisory before future dependency releases. Do not describe the full development audit as clean or suppress the entries.

## Evidence and validation

The release evidence directory records before/after raw npm reports, the production-only audit, Python baseline and audit, unit/scientific tests, production build, browser matrix and real isolated uploads/downloads. Local WebKit uses pre-existing user-scoped shared libraries; CI installs the official browser dependencies and runs the complete existing gate. No algorithm or task API behavior is changed by the frontend dependency migration.
