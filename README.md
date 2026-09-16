# gap133

Cross-venue prediction market terminal: live odds and price gaps between
Polymarket and Kalshi on the same events, ranked in cents. Domain: gap133.xyz
(pending purchase). The daily ritual this product hands you: the "1.33c gap of
the day" post, every day, from real data.

## What is running

- Next.js 15 app (App Router, TypeScript), single dashboard page plus a JSON API.
- `lib/polymarket.ts` pulls the top open markets by 24h volume from Polymarket's
  public gamma-api.
- `lib/kalshi.ts` pulls top markets from Kalshi's public trade-api v2 (paginated
  events endpoint with nested markets; the flat markets endpoint is polluted by
  provisional parley shards, do not switch).
- `lib/matcher.ts` is the cross-venue matcher: token Jaccard + sequence ratio +
  proper-name boost, auto-match at 0.65, review band 0.45-0.65. Validated
  2026-09-16: 41 confident pairs from the top 150 markets per venue.
- `lib/snapshot.ts` caches one snapshot in-process for 120s and deduplicates
  concurrent fetches. The page server-renders the latest snapshot; the client
  re-polls `/api/snapshot` every 2 minutes.

## Run locally

npm install
npm run build
npm start            # http://localhost:3000

## Deploy to Railway

1. Create a new repo on GitHub (the integration cannot create repos) and push
   this directory, or use "railway init" from the CLI in this folder.
2. Railway auto-detects Next.js: build command `npm run build`, start command
   `npm start`. Node 20+ pinned via package.json engines is not needed; the
   app builds on Node 22 and 24.
3. Add a domain when purchased (e.g. gapwatch.io) in Railway's domain settings;
   no environment variables are required for v0.

## Payments (v0)

Founding desk tier is $15/month, crypto only. v0 flow is manual: publish the
receiving addresses (USDC/USDT on a cheap chain, BTC, ETH) on the pricing
section once wallet addresses exist, collect email + tx hash, and track
subscriptions in a ledger (email, tx hash, amount, asset, INR FMV at receipt
for tax, expiry date). The "Pay with crypto" button currently opens a
placeholder mailto; replace with the real address block when the wallet is
set up. Auto-renewal and automated confirmation are deliberate later additions.

## Known limitations (v0)

- One in-process snapshot cache: fine for a single Railway instance; add Redis
  or a shared cache before scaling horizontally.
- No gap history persistence yet; add a Postgres table (pairs, fetched_at,
  kx_yes, pm_yes) on a cron to build the history charts promised in the paid tier.
- The matcher review band (0.45-0.65) is displayed nowhere yet; those pairs are
  dropped from the board until manually approved.
- Prices shown are mid/bid snapshots; per-venue tick sizes differ.

