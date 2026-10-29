# easymsa

The Benchmark preview adds a reviewed DNA/RNA dataset catalog and batch-specific
public result views. Start with `npm run build:benchmark` and
`npm run preview:benchmark`, then open `http://127.0.0.1:5208/#/about` and follow the Benchmark entry.
The initial catalog has **26 datasets, nine methods, and no published scores**.
See [Benchmark data and publication guide](docs/BENCHMARK.md) for result imports and tests.

easymsa is the static frontend for a friendly multiple sequence alignment web
server. It submits real jobs to the EasyMSA backend, restores jobs with access
tokens, supports bilingual UI, and visualizes MSA results.

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

Use `.env.local` for the backend API during local development:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

or run with an inline override:

```bash
VITE_API_MODE=real VITE_API_BASE_URL=http://localhost:8000/api npm run dev
```

The app uses hash routes, for example:

```text
/#/
/#/submit
/#/viewer
/#/lookup
/#/job/<jobId>?token=<token>
/#/results/<jobId>?token=<token>
/#/docs
/#/about
```

## Build

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Production Deployment

The production frontend is hosted at https://easymsa.cn/ and uses
https://api.easymsa.cn/api. GitHub stores the source code; pushing commits does
not build or deploy the frontend. GitHub Pages publishing has been removed.
Frontend CI is available for pull requests and manual runs.

Build a production release with Node.js specified in `.nvmrc`:

```bash
EASYMSA_BASE_PATH=/ VITE_API_MODE=real VITE_API_BASE_URL=https://api.easymsa.cn/api VITE_ICP_NUMBER=冀ICP备2026045022号 npm run build
```

Deploy `dist/` to a versioned directory on the production server, verify the
public example resource hashes, and switch the Nginx frontend link after
validation. Keep the previous release for rollback. Record the source commit
in `release.json`.

The backend must allow the production frontend origin `https://easymsa.cn`.

## Backend API

The frontend expects the backend API at:

```text
POST https://api.easymsa.cn/api/jobs
GET https://api.easymsa.cn/api/jobs/:jobId?token=...
GET https://api.easymsa.cn/api/jobs/:jobId/results/summary?token=...
GET https://api.easymsa.cn/api/jobs/:jobId/results/alignment?token=...
```

## Email Notifications

The submit form sends any valid notification email address to the backend. To
send to arbitrary user inboxes, the backend Resend configuration must use a
verified sending domain, for example:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
RESEND_FROM_EMAIL="EasyMSA <noreply@mail.easymsa.cn>"
```

`onboarding@resend.dev` is only suitable for Resend test mail and may deliver
only to the Resend account owner's email.

## Project runtime

Use Node.js 24.21.0 (`.nvmrc`) for development and CI. Install the pinned dependencies with `npm ci`. The Windows/WSL launcher accepts `EASYMSA_NODE_BIN` pointing to a Node 24 executable and also detects the project-local runtime under `../.runtime/node-v24.21.0-linux-x64/bin/node`; it does not change the runtime of other projects. See [dependency audit](docs/dependency-audit-20261003.md) for the security update and retained build-time advisory.
