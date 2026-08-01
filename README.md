# Mompuffs

A prototype of a Facebook-style social feed with a marketplace attached:
member profiles, posts/likes/comments, follows, member-run shops, a
marketplace to browse all shops' products, a simulated checkout, and
product-import adapters for Printify, Printful, and Peaprint.

This is a **working prototype**, not a production deployment: authentication,
data model, and core flows are real and functional, but checkout is
simulated (no payment processor), and the POD import adapters need your own
API credentials to pull real data.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (swap to Postgres for production — see below)
- NextAuth (credentials/email+password auth, JWT sessions)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file and fill in a random `NEXTAUTH_SECRET` (any long random
   string; `openssl rand -base64 32` works):

   ```bash
   cp .env.example .env.local
   ```

3. Create the SQLite database and tables:

   ```bash
   npm run db:push
   ```

4. (Optional) Seed demo data — two users, a shop, two products, two posts:

   ```bash
   npm run db:seed
   ```

   Demo logins: `mel@example.com` / `password123` and `ana@example.com` / `password123`.

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

## Project structure

- `src/app/feed` — social feed (posts, likes, comments)
- `src/app/profile/[username]` — public profile + follow button
- `src/app/marketplace`, `src/app/product/[id]`, `src/app/shop/[slug]` — public storefront
- `src/app/dashboard/shop` — seller dashboard: create a shop, add products manually, import from POD providers
- `src/app/dashboard/shop/import` — POD catalog browser/importer
- `src/app/cart`, `src/app/checkout`, `src/app/orders` — cart (browser-local) → simulated checkout → order history
- `src/lib/pod/*` — one adapter per POD provider behind a shared `PodAdapter` interface
- `prisma/schema.prisma` — full data model

## Print-on-demand integrations

Each provider is a separate adapter in `src/lib/pod/`, all implementing the
same `listProducts()` interface, so the import UI and API route don't care
which provider is active.

- **Printify** (`src/lib/pod/printify.ts`) — real integration against the
  Printify REST API v1 (`https://api.printify.com/v1/`), Bearer token auth.
  Needs `PRINTIFY_API_KEY` (Personal Access Token from *My Profile →
  Connections*) and `PRINTIFY_SHOP_ID`.
- **Printful** (`src/lib/pod/printful.ts`) — real integration against the
  Printful REST API v1 (`https://api.printful.com/`), Bearer private token.
  Needs `PRINTFUL_API_KEY` (Developer Portal → Private Token).
- **Peaprint** (`src/lib/pod/peaprint.ts`) — **placeholder only.** As of this
  build, Peaprint doesn't have a public developer portal or published API
  reference the way Printify/Printful do. The adapter is wired into the same
  interface and will light up automatically once you have real
  docs/credentials from Peaprint — see the comments at the top of that file
  for exactly what to change.

Add credentials to `.env.local` (never commit real keys) and restart the dev
server; the "Import from Printify / Printful / Peaprint" page in the seller
dashboard will start returning live data instead of a "not configured" error.

## Known limitations / next steps

- **Checkout is simulated.** `POST /api/orders` creates a `PAID` order
  directly — there's no Stripe/PayPal integration. Wiring a real processor
  is the natural next step before taking real money.
- **One shop per user.** The schema supports it (`Shop.ownerId` is unique);
  loosen that if you want multi-shop sellers.
- **No image upload.** Product/post images are URLs you paste in. Add
  S3/Cloudinary/UploadThing for real file uploads.
- **SQLite is for local dev only.** For production, change the `datasource`
  provider in `prisma/schema.prisma` to `postgresql` and point
  `DATABASE_URL` at a real database (e.g. Vercel Postgres, Supabase, Neon).
- **Peaprint adapter is a stub** — finish it once you have real API docs.
- No direct messaging, notifications, or media feed (photos/reels) yet —
  the schema (`User`, `Post`, `Comment`, `Like`, `Follow`) is intentionally
  simple to extend.
