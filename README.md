# Horizon — UI Demo

A public, **synthetic** showcase of an executive P&L intelligence dashboard
(Next.js 15 + React 19 + Tailwind + shadcn/ui + Recharts).

**Everything here is fake.** There is no backend, no database, and no network
call. All data is generated in-browser from `src/lib/demo/`. Company names,
clients, vendors, and consultants are invented, and **every financial figure is
masked** (`$•••••`) — this build demonstrates the interface and the analytics
structure, not real numbers.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy (Vercel)

Import this repo into Vercel. It auto-detects Next.js — no configuration, no
environment variables. Click Deploy.

## What's shown

Overview, per-company comparison, clients, consultants, customers/channels,
vendors, billing, accounts-receivable aging, and a margin-waterfall insight —
all driven by the synthetic dataset.
