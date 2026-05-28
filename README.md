# easymsa

easymsa is a static frontend prototype for a friendly multiple sequence alignment web server. It supports mock job submission, simulated job status, bilingual UI, small-scale MSA visualization, and demo result downloads.

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- React Router with `HashRouter`
- React Hook Form
- Zod
- lucide-react

## Local Development

```bash
npm install
npm run dev
```

The app uses hash routes, for example:

```text
/#/
/#/submit
/#/job/demo-job
/#/results/demo-job
/#/examples
/#/docs
/#/about
```

## Build

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## GitHub Pages Deployment

This repository is configured for a GitHub Pages project site at:

```text
https://malabz.github.io/easymsa/
```

`vite.config.ts` uses:

```ts
base: "/easymsa/"
```

If the project is later moved to a user or organization site repository such as `<username>.github.io`, change the Vite base to:

```ts
base: "/"
```

The deployment workflow is in `.github/workflows/deploy.yml` and builds the static site with Node 20 before deploying `dist/` to GitHub Pages.

## Mock API Mode

The current version does not require a backend. Jobs, status progression, results, and downloads are simulated in the browser.

Use `.env.example` as the default configuration:

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=
```

## Future Backend API Mode

The API layer is isolated under `src/lib/api/` so it can later call a remote service:

```env
VITE_API_MODE=remote
VITE_API_BASE_URL=https://api.example.com
```

Expected future endpoints:

```text
POST /jobs
GET /jobs/:jobId
GET /jobs/:jobId/results
GET /jobs/:jobId/results/summary
```

## Demo Data

Static demo assets live in `public/demo/`:

- `input_sequences.fasta`
- `alignment.json`
- `alignment.fasta`
- `summary.json`
- `all_results.zip`

These files are served directly by Vite and GitHub Pages.
