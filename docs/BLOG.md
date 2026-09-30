# Blog (fed by Socrates)

Public: `/blog` (gallery with search, category filter, newest/oldest sort; 12 per page)
and `/blog/[slug]`. Admin: `/admin/blog` (articles, Socrates connection status, Import),
`/admin/blog/categories`, `/admin/blog/[id]` (edit page).

Articles are written in **Socrates** (`socrates-standalone`, socsa.innovativeonlinesolution.com).
mompuffs is a **Custom website** in Socrates and uses only what Socrates already offers;
nothing on the Socrates side is changed. All of it lives in `src/lib/socrates.ts`.

- **Publish / send in Socrates** → Socrates POSTs the signed `post.published` payload to
  `/api/webhooks/socrates` (HMAC `X-Socrates-Signature`, the profile's webhook secret).
  The article is created or updated here (matched on its Socrates id). A signed `ping`
  (Socrates' Test connection) answers 200.
- **Import from Socrates** (all published) and **Pull latest** (one article) read
  `GET /api/feed/<siteId>` with the profile's feed key.
- **Edit page**: "Open in Socrates editor" goes to the original. Saving on mompuffs only
  changes mompuffs, and the next update from Socrates replaces those content fields.
  **Category and visibility (Live/Hidden) are mompuffs-only** and survive every update.
  A new article's category is picked from its Socrates pillar (created if missing).
- Deleting an article here doesn't touch Socrates (it returns on the next import). Use Hidden instead.

## Adding mompuffs as a site in Socrates

1. In Socrates, create the profile and set Publishing to **Custom website** with receiving
   address `https://mompuffs.com/api/webhooks/socrates` and a webhook secret. Note the
   site id and feed key.
2. In Vercel (mompuffs) set `SOCRATES_SITE_ID`, `SOCRATES_FEED_KEY`, `SOCRATES_WEBHOOK_SECRET`
   (and `SOCRATES_URL` only if the desk moves). Redeploy.
3. Use **Test connection** in Socrates, then **Import from Socrates** in `/admin/blog`.
