# Homepage workflow and benefits

The below-cover homepage now follows the selected first Product Design concept. The accepted cover and its animation are retained.

## Sections

1. Interactive numbered workflow: reading input, automatic selection and alignment output. A visible loop, progress slider, step controls and illustrative dataset scale are available.
2. Feature flow: sequence properties connect to automatic method selection and a region of the public alignment. Low / Medium / High visual options illustrate the workflow without running a new task.
3. Alignment exploration: drag the horizontal overview or enter a column to pan, click a column to inspect statistics, and open the existing full-screen example viewer. Submission, input download and task recovery remain linked.

## Data and assets

- Example: `alignment-small`, version `v1`, 20 sequences and 515 columns.
- `clean.fasta` and `final.alignment.json` use the existing manifest hash checks. Output identity, length and ungapped content are validated before display.
- Existing nucleotide metrics calculate column statistics once, when the data loads. Canvas drawing uses the real sequences and statistics. It does not initialize the full viewer on the homepage.
- Public resources are fetched when the user approaches the below-cover content and cached by example/version. The production API is not used to generate the demonstrations.
- Generated feature connection asset: `public/media/home/benefits/feature-connections.webp`, 1140 × 720, 12,572 bytes.
- Chinese and English content: `homeBenefitsContent` in `src/lib/homeContent.ts`.
- Motion stops when the workflow is offscreen or the document is in the background. Controls allow users to pause, scrub and replay. Reduced-motion settings slow sequence motion and suppress decorative animation.

## Local validation

- Production build passed.
- Public example data tests: 5 passed.
- Workflow, scale, difference selector, overview, position input, full-example navigation and example download checked in the in-app browser.
- Desktop widths: 1440 and 1280. Mobile widths: 390 and 360. No horizontal document overflow found.
- Downloaded input matches the repository source SHA256.
- Detailed comparison evidence and limitations are in project-root `design-qa.md`. Existing design QA was backed up under the task's `implementation/before` directory.

This is a local implementation. No remote push, Pages publication, backend deployment or algorithm change is included.
