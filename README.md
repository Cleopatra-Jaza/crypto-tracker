# Crypto Tracker

Real-time cryptocurrency price tracker built with Next.js.

**Live demo:** https://crypto-tracker-kappa-ivory.vercel.app

## Features
- Live prices for the top 50 coins (auto-refresh every 60s)
- Search by name or symbol
- Interactive price charts (1D / 7D / 30D / 1Y)
- Watchlist saved in the browser
- Server-side API routes with caching and rate-limit handling
- GitHub sign-in with Auth.js
- Portfolio tracker with profit/loss and allocation, stored in PostgreSQL (Neon) via Prisma

## Tech Stack
Next.js, TypeScript, Tailwind CSS, Lightweight Charts, CoinGecko API, Auth.js, Prisma, PostgreSQL (Neon)

## Run locally
npm install
npm run dev