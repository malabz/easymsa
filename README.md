# easymsa

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

The deployment workflow is in `.github/workflows/deploy.yml` and builds the
static site with Node 20 before deploying `dist/` to GitHub Pages. The GitHub
Pages build uses:

```yaml
VITE_API_MODE: real
VITE_API_BASE_URL: https://api.easymsa.cn/api
```

Because GitHub Pages is served over HTTPS, the backend API must also use HTTPS.
The backend server should allow this frontend origin in CORS:

```env
CORS_ALLOW_ORIGINS=https://malabz.github.io,http://localhost:5173,http://127.0.0.1:5173
```

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
