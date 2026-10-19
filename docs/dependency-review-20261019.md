# Dependency review — 2026-10-19

## Scope and result

Node.js 24.21.0; independent clean npm ci from the candidate lockfile. React 18.3.1 and Tailwind 3.4.19 retained. No automatic build/deploy workflow was enabled.

| Audit | Before | After |
|---|---|---|
| All frontend dependencies | 5 high, 2 moderate | 5 high, 0 moderate |
| Frontend production dependencies | 0 | 0 |

Tailwind and its postcss-nested subtree use explicitly scoped postcss-selector-parser 7.1.6 overrides. The official [selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) lists 7.1.6 as patched. All three compiled CSS outputs are byte-identical to the previous candidate build. The dependency license snapshot contains 300 entries and zero unresolved declared licenses.

## Remaining advisory

The official [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched version at the time of this check. npm reports five affected packages: braces, chokidar, micromatch, fast-glob and tailwindcss. This is one underlying nested-pattern denial-of-service issue propagated through the development tool chain. Some intermediate packages have update suggestions, but these do not supply a patched braces release or close the root advisory.

The matching rules come from maintained project configuration. Uploaded FASTA and task metadata are not used as Tailwind content paths or file-matching expressions. Local development services bind only to loopback. Build trusted source in an isolated process; do not expose a build service or accept untrusted glob expressions. These controls limit reachability; they do not remove the advisory. Reassess when upstream supplies a patched braces version or a compatible dependency chain stops using it. No risk acceptance or deployment is implied by this local review.

## Reproduction

Use Node.js 24.21.0 and npm ci, then npm audit --json and npm audit --omit=dev --json. Run npm test and npm run test:e2e:prepare. Run browser groups individually using the package scripts. The preview uses root / and the formal API build setting; intercepted UI tests never submit to production. Visual baselines are platform-specific; the Linux files are preserved, while the new Windows baselines were reviewed separately.
