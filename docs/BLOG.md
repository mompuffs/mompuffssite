# Blog (synced with Socrates)

Public: `/blog` (gallery with search, category filter, newest/oldest sort; 12 per page)
and `/blog/[slug]`. Admin: `/admin/blog` (articles, Socrates connection status, Import),
`/admin/blog/categories`, `/admin/blog/[id]` (edit page).

Articles are written in **Socrates** (`socrates-standalone`, socsa.innovativeonlinesolution.com),
where mompuffs is one profile. Sync is two-way; all of it lives in `src/lib/socrates.ts`.

| Direction | How |
|---|---|
| Socrates → mompuffs, on publish or on any edit of a published article | Socrates POSTs the signed `post.published` payload to `/api/webhooks/socrates` (HMAC `X-Socrates-Signature`, profile's webhook secret). Upsert by Socrates id. |
| Socrates → mompuffs, on demand | "Import from Socrates" (all published) and "Pull latest" (one article) read `GET /api/feed/<siteId>` with the feed key. |
| mompuffs → Socrates | Saving the edit page PATCHes `/api/feed/<siteId>` with the feed key, sending `expectedUpdatedAt`. A newer Socrates edit answers 409 and the page offers Pull latest / Overwrite. If Socrates is unreachable the save is kept locally and flagged "Out of sync" until the next successful save. |

Synced fields: title, dek, TL;DR, body (markdown), SEO title/description, cover image + alt,
author, tags. FAQ and sources come in from Socrates but aren't edited here.
**mompuffs-only:** category and visibility (Live/Hidden). A new article's category is picked
from its Socrates pillar (created if missing); after that the admin's choice sticks.
Deleting an article here doesn't touch Socrates (it returns on the next import). Use Hidden instead.

## Setup

1. In Socrates, on the mompuffs profile, set Publishing to **Custom website** with receiving
   address `https://mompuffs.com/api/webhooks/socrates` and a webhook secret. Note the site id
   and feed key.
2. In Vercel (mompuffs) set `SOCRATES_SITE_ID`, `SOCRATES_FEED_KEY`, `SOCRATES_WEBHOOK_SECRET`
   (and `SOCRATES_URL` only if the desk moves). Redeploy.
3. Use "Test connection" in Socrates (sends a signed `ping`), then "Import from Socrates" in
   `/admin/blog`.

Needs socrates-standalone with the feed `PATCH` endpoint and edit re-send (commit "Two-way
sync for custom websites").
