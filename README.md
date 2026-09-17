# Synchrone Recall

A proactive knowledge system for Synchrone's consulting engagements — not a reactive chatbot. Every recording is auto-transcribed, timecoded, and analyzed at upload; when a new project comes in, the system surfaces the most similar past engagements before anyone has to search for them.

**Live app:** https://synchrone-recall.vaultx.workers.dev
**Repo:** https://github.com/charlezegama-code/synchrone-recall

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind v4 + Framer Motion (`/frontend`), served as static assets directly by the Worker
- **Backend:** Cloudflare Workers + Hono (`/worker`)
- **Data:** Cloudflare D1 (metadata, transcripts, analysis, chunks) + Cloudflare Vectorize (chunk & problem-summary embeddings, with a D1-JSON cosine-similarity fallback path)
- **Media:** Cloudflare R2 (uploaded audio/video)
- **AI:** Cloudflare Workers AI — Whisper (STT), Llama 3.3 (analysis/QA), BGE-base (embeddings)

## Structure

```
frontend/   Vite React app (Library, Ask, New Project views)
worker/     Hono API + D1 migrations + seed/eval scripts
```

## Local development

```bash
cd worker && npm install
npx wrangler d1 execute synchrone-recall-db --local --file=./migrations/0001_init.sql
npm run dev            # starts the worker on :8787

cd ../frontend && npm install
npm run dev             # Vite dev server proxies /api to :8787
```

## Deploying

```bash
cd frontend && npm run build     # outputs frontend/dist, served by the Worker
cd ../worker && npx wrangler deploy
```

## Seeding sample data

```bash
cd worker
node seed/seed.mjs            # seeds 5 synthetic consulting scenarios against the deployed URL
node seed/eval.mjs            # runs the 5-case evaluation harness
```

See the end of the project handoff notes for the full list of assumptions, simplifications, and fallbacks made during this build.
