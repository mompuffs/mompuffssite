# Ecommerce / Marketplace — Handoff Document

Scope: everything under Mompuffs that lets a user open a **shop**, list
**products**, and lets other users **buy** them (cart → checkout → payment →
order → fulfillment), plus the tooling sellers use to populate their shop
(manual entry, CSV bulk import, Printify/Printful print-on-demand import,
public-URL scraping) and to get paid (Stripe/PayPal, per-shop).

This doc is written for someone standing this feature up on **their own
site**, with **their own credentials** for every third-party service. It
assumes you already have the rest of the app running (auth, DB, hosting) —
see [External dependencies outside this doc](#external-dependencies-outside-this-doc)
for the handful of things this module leans on that live outside its scope.

---

## 1. The one thing to understand before anything else

**There are no platform-wide payment or POD credentials.** Every shop
connects its *own* Stripe, PayPal, Printify, and/or Printful account from its
own dashboard. Credentials are encrypted (AES‑256‑GCM, keyed off
`NEXTAUTH_SECRET`) and stored per-shop in `PaymentConnection` /
`PodConnection` rows — never in `.env`, never shared across shops.

So installing this feature is really two separate things:
1. **Deploying the code + schema** (this doc, one-time, done by you).
2. **Each seller connecting their own accounts** (self-service, done by them,
   from `/dashboard/shop/payments` and `/dashboard/shop/connections` — no
   admin/env work needed per seller).

If you're evaluating whether this is "installed correctly," the right test
isn't "did I put a Stripe key in `.env`" — it's "can a user create a shop,
connect *their* Stripe test keys from the dashboard, and complete a test
purchase."

---

## 2. Environment variables

Only these are required for the ecommerce module itself:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Yes | Postgres connection (Prisma). See `prisma/schema.prisma`. |
| `NEXTAUTH_SECRET` | Yes | Also used as the key-derivation source for encrypting stored payment/POD credentials ([src/lib/crypto.ts](../src/lib/crypto.ts)). Rotating this breaks decryption of every stored credential — treat it like a real secret, not a placeholder. |
| `RESEND_API_KEY` | No | Sends the "you made a sale" email to a shop owner after checkout ([src/lib/email.ts](../src/lib/email.ts)). Without it, the app logs a warning and skips the email — checkout still completes fine. |
| `RESEND_FROM_EMAIL` | No | Defaults to Resend's sandbox sender. Set once you've verified a domain in Resend. |
| `NEXTAUTH_URL` | Indirect | Used to build the "view and fulfill this order" link in sale-notification emails. |

Nothing else is needed at the environment level — no `STRIPE_SECRET_KEY`,
no `PAYPAL_CLIENT_ID`, no `PRINTIFY_API_KEY`. Those are all entered through
the UI, per shop (see §5).

---

## 3. Database

Run the standard Prisma flow against your own Postgres instance:

```bash
npx prisma migrate deploy   # or `prisma db push` for a fresh dev DB
npx prisma generate
```

The ecommerce-relevant models, all in [prisma/schema.prisma](../prisma/schema.prisma):

- **`Shop`** — one per user (`ownerId` is `@unique`). Holds `flatShippingCents`
  (default per-order shipping) and `visitCount` (loose page-view counter for
  the "Top Shops" sidebar).
- **`Product`** / **`ProductVariant`** / **`ProductImage`** — `source` is one
  of `MANUAL | PRINTIFY | PRINTFUL | CSV | URL`. A product with no variants
  uses its own `priceCents`; a product with variants uses each variant's own
  price (see `src/lib/checkout.ts`). `shippingMode` is `FLAT | PRODUCT | FREE`
  per product (see §7).
- **`Category`** — two-level tree, scoped per shop (`parentId` self-relation),
  many-to-many with `Product`.
- **`Coupon`** — scoped per shop; `type` is `PERCENT | FIXED`.
- **`PaymentConnection`** / **`PodConnection`** — encrypted credential storage,
  one row per shop per provider (`@@unique([shopId, slug])` /
  `@@unique([shopId, provider])`).
- **`Order`** / **`OrderItem`** — a single `Order` can span multiple shops
  (multi-vendor cart), but see the checkout limitation in §9. Billing and
  shipping addresses are flattened onto `Order` (not a separate Address
  model). `OrderItem.fulfilledAt` is set **independently per shop** so one
  seller can mark their items done while another's are still open.

SQLite note in the schema header is stale — the app runs on Postgres in
production (`datasource db { provider = "postgresql" }`); `ProductSource` and
`OrderStatus` are plain strings rather than enums, treated as closed sets in
application code only.

---

## 4. External dependencies outside this doc

These aren't part of the ecommerce feature itself, but the ecommerce pages
`import` from them, so a bare-bones install without them will have broken
edges:

- **Auth** — `getCurrentUser()` ([src/lib/session.ts](../src/lib/session.ts))
  wraps NextAuth. Every ecommerce API route requires a logged-in user except
  the public read routes (`/api/shops`, `/api/shops/top`, product/shop pages).
- **Media uploads** — `ImageInput` ([src/components/ImageInput.tsx](../src/components/ImageInput.tsx))
  calls `uploadMedia()` ([src/lib/mediaUpload.ts](../src/lib/mediaUpload.ts)),
  which gets a signed token from `/api/upload/token` and uploads directly to
  a self-hosted media server (MinIO + resize/transcode service). Product
  photos are otherwise just plain URL strings in the DB (`imageUrl` fields),
  so **you can skip the media server entirely** and have sellers paste image
  URLs instead — nothing in the ecommerce schema/logic requires that specific
  upload pipeline.

---

## 5. Connecting payment processors (per shop)

UI: `/dashboard/shop/payments` → [src/app/dashboard/shop/payments/page.tsx](../src/app/dashboard/shop/payments/page.tsx)
API: [src/app/api/payments/connections/route.ts](../src/app/api/payments/connections/route.ts)
Provider field definitions: [src/lib/payments/providers.ts](../src/lib/payments/providers.ts)

Built-in providers, each shop connects independently:

| Provider | Fields collected | Notes |
|---|---|---|
| **Stripe** | Secret Key (`sk_...`), Publishable Key (`pk_...`) | [src/lib/payments/stripe.ts](../src/lib/payments/stripe.ts) — a plain `Stripe(secretKey)` client is constructed per-request with the shop's own key, nothing global. |
| **PayPal** | Client ID, Client Secret, Environment (`sandbox`/`live`) | [src/lib/payments/paypal.ts](../src/lib/payments/paypal.ts) — raw REST calls (OAuth2 client-credentials) against `api-m.sandbox.paypal.com` or `api-m.paypal.com`. No PayPal SDK dependency. |
| **Square** | Access Token, Location ID | Fields are defined and the connect UI works, **but there is no `src/lib/payments/square.ts`** — no checkout route actually calls Square. Connecting it stores credentials with no effect until that integration is built. |
| **Custom** (e.g. Authorize.net) | API Key/Secret, free-text "Additional details" | Same storage path (`provider: "CUSTOM"`, slugified display name), but again **no checkout logic reads it** — it's a credential vault with no consuming integration yet. |

A shop owner gets these values from their own Stripe/PayPal dashboards
(Stripe: Developers → API keys; PayPal: My Apps & Credentials, create a REST
app for the desired environment). Nothing on your end needs configuring —
the "Connect" button on that page is the entire setup flow.

**Working checkout today = Stripe and/or PayPal only.** The checkout page
([src/app/checkout/page.tsx](../src/app/checkout/page.tsx)) only ever queries
`/api/checkout/stripe/config` and `/api/checkout/paypal/config`; if a shop
has connected neither, checkout shows "This shop hasn't set up a payment
method yet."

---

## 6. Connecting POD (print-on-demand) providers (per shop)

UI: `/dashboard/shop/connections` → [src/app/dashboard/shop/connections/page.tsx](../src/app/dashboard/shop/connections/page.tsx)
Adapters: [src/lib/pod/printify.ts](../src/lib/pod/printify.ts), [src/lib/pod/printful.ts](../src/lib/pod/printful.ts)

| Provider | Fields | Where the seller gets them |
|---|---|---|
| Printify | Personal Access Token, Shop ID | My Profile → Connections in Printify |
| Printful | Private Token | Developer Portal → Private Token (store **must** be a "Manual order platform / API" store — native Etsy/Shopify-linked Printful stores return an error the adapter surfaces verbatim) |

Once connected, `/dashboard/shop/import` lets the seller browse their own
POD catalog and import individual products (with variants, price, and
gallery images normalized into the common `ImportableProduct` shape —
[src/lib/pod/types.ts](../src/lib/pod/types.ts)) into their Mompuffs shop as
`Product` rows with `source: "PRINTIFY" | "PRINTFUL"`. **This is a one-time
copy, not a sync** — price/stock changes on the provider's side don't
propagate after import.

---

## 7. Core flows

### Buyer: browse → cart → checkout → order
1. `/marketplace` or `/shop/[slug]` list products (`ProductCard`).
2. `/product/[id]` — variant picker (`ProductViewer`) if the product has
   variants, otherwise a plain `AddToCartButton`.
3. Cart lives in **`localStorage`** only (`CartContext`, key
   `mompuffs.cart`) — no server-side cart table. `cartLineKey()` treats each
   variant as a distinct line.
4. `/checkout` — collects billing/shipping addresses, then:
   - Applies a coupon via `/api/coupons/validate` → `evaluateCoupon()`
     ([src/lib/coupons.ts](../src/lib/coupons.ts)) — **a coupon only
     discounts its own shop's line items**, never the whole multi-vendor
     cart.
   - Quotes shipping via `/api/checkout/shipping` → `calculateShippingCents()`
     ([src/lib/shipping.ts](../src/lib/shipping.ts)).
   - Renders `StripeCheckoutForm` and/or `PayPalCheckoutButton` for
     whichever processor(s) the single shop in the cart has connected.
5. On successful payment, the processor's **confirm/capture** route
   (`/api/checkout/stripe/confirm` or `/api/checkout/paypal/capture-order`)
   re-verifies the payment server-side, then calls `createPaidOrder()`
   ([src/lib/orders.ts](../src/lib/orders.ts)), which re-prices the cart from
   the DB (never trusts client-submitted prices), re-applies the coupon,
   creates the `Order` + `OrderItem` rows inside a transaction, increments
   `Coupon.usedCount`, and emails each represented shop owner a sale
   notification.
6. `/orders` shows the buyer's own order history.

### Seller: get paid + fulfill
1. Create a shop (`CreateShopForm` → `POST /api/shop`).
2. Add products (manual form, CSV, POD import, or URL import — see §6 and
   the import page for all four paths in one UI:
   [src/app/dashboard/shop/import/page.tsx](../src/app/dashboard/shop/import/page.tsx)).
3. Connect Stripe and/or PayPal (§5).
4. Set shipping: shop-level flat rate (`/dashboard/shop/shipping`) and/or
   per-product overrides (`ShopProductRow`'s "Shipping" editor).
5. Optionally create coupons (`/dashboard/shop/coupons`).
6. `/dashboard/shop/orders` shows **only this shop's line items** from every
   order (even ones that also contain another shop's items), with a
   mark-complete toggle that only ever touches this shop's `OrderItem` rows
   (`PATCH /api/shop/orders/[id]`).

---

## 8. File map

```
prisma/schema.prisma                     Shop, Product(Variant/Image), Category,
                                          Coupon, PaymentConnection, PodConnection,
                                          Order, OrderItem

src/lib/
  checkout.ts                            priceCartItems() — re-prices a client cart
                                          against the DB; shared by every checkout path
  orders.ts                              createPaidOrder() — the only way an Order
                                          is ever created
  coupons.ts                             evaluateCoupon() — per-shop discount logic
  shipping.ts                            calculateShippingCents() — FLAT/PRODUCT/FREE
  csvProducts.ts                         CSV parsing + template generator
  urlImport.ts                           SSRF-guarded public product-page scraper
                                          (JSON-LD / Open Graph)
  categories.ts                          find-or-create category tree helper
  money.ts                               formatCents()
  crypto.ts                              AES-256-GCM encrypt/decrypt for stored creds
  email.ts                               sendSaleNotification()
  payments/
    providers.ts                        BUILTIN_PAYMENT_PROVIDERS field defs
    connections.ts                      getShopPaymentCreds() (decrypt)
    stripe.ts / paypal.ts               processor clients
  pod/
    types.ts / index.ts                 adapter interface + registry
    printify.ts / printful.ts           provider adapters
    connections.ts                      getShopCredentials() (decrypt)
    html.ts                             stripHtml() for POD-sourced descriptions

src/app/api/
  shop/                                  shop CRUD, products, coupons, orders,
                                          shipping, CSV import, URL import
  shops/, shops/top/                     public shop listing (force-dynamic!)
  pod/                                   catalog browse + import, connection CRUD
  payments/connections/                  processor connection CRUD
  checkout/{stripe,paypal}/              create-intent/create-order, confirm/capture,
                                          config (public-key lookup)
  checkout/shipping/                     shipping quote
  coupons/validate/                      coupon validation
  orders/                                buyer order history
  categories/                            category CRUD

src/app/
  marketplace/, shop/[slug]/, product/[id]/    public browsing
  cart/, checkout/                             buyer flow
  orders/                                      buyer order history
  dashboard/shop/{,orders,import,connections,
    payments,coupons,shipping}/                seller dashboard

src/components/
  CartContext.tsx                       localStorage cart
  ProductCard.tsx, ProductGallery.tsx,
  ProductViewer.tsx                     product display + variant picker
  AddToCartButton.tsx, AddProductForm.tsx,
  ShopProductRow.tsx, CreateShopForm.tsx,
  CategoryPicker.tsx, ImageInput.tsx    seller-side product management
  StripeCheckoutForm.tsx,
  PayPalCheckoutButton.tsx              payment UI
  TopShops.tsx, TopStores.tsx           sidebar widgets (see below)
```

---

## 9. Known limitations / gotchas

Read this before assuming a bug report is new behavior — several of these
are deliberate simplifications already called out in code comments:

- **Checkout is single-shop only.** `priceCartItems()` can price a
  multi-vendor cart, but both the Stripe and PayPal order-creation routes
  reject a cart spanning more than one shop with a 400. The checkout page
  surfaces this with an inline warning telling the buyer to check out shops
  separately. A true multi-vendor split-payment checkout is not implemented.
- **No payment webhooks.** Orders are only ever created by the browser
  calling `/confirm` or `/capture-order` after the payment SDK reports
  success client-side. If the tab closes between a successful charge and
  that call completing, the payment succeeds but no `Order` is created —
  the code comments flag this explicitly ("needs manual reconciliation
  using the capture ID logged here"). There's no Stripe/PayPal webhook
  handler to reconcile these after the fact.
- **No inventory/stock tracking.** `ProductVariant.isAvailable` is a manual
  boolean, not decremented by purchases. Nothing prevents overselling.
- **Square and "Custom" processors are vault-only.** Credentials save
  successfully but no checkout code reads them (§5).
- **Coupon `usedCount` has a small race window.** The max-uses check reads
  `usedCount` before the order transaction increments it; two near-simultaneous
  checkouts against the last remaining use could both succeed.
- **`Shop.visitCount`** is a loose, non-deduped page-view counter (any
  visit, including repeat visits, refreshes) — fine for ranking "Top
  Shops"/"Top Stores" sidebars, not a real analytics number.
- **Public GET routes need `export const dynamic = "force-dynamic"`.**
  `/api/shops`, `/api/shops/top`, and the shop/product/marketplace pages all
  set this explicitly — without it, a no-auth GET with no other dynamic API
  usage gets statically cached at build time and never reflects new shops,
  products, or visit counts. If you add a new public ecommerce route, carry
  this forward.
- **No refund UI.** `refundPaymentIntent()` / `refundCapture()` exist in the
  payment libs but nothing in the app calls them — refunds today are a
  manual operation against Stripe/PayPal's own dashboard.
- **URL import is single-product only per URL**, with a separate "discover"
  step that crawls a listing page's `rel="next"` pagination (capped at 3
  pages / `MAX_DISCOVER_COUNT = 50` results) to find individual product
  links before scraping each one.

---

## 10. Install checklist (fresh deployment)

1. Provision Postgres, set `DATABASE_URL`/`DIRECT_URL`.
2. Set `NEXTAUTH_SECRET` to a real random secret (also gates credential
   encryption — see §1). Set `NEXTAUTH_URL` to your deployed origin.
3. `npx prisma migrate deploy && npx prisma generate`.
4. (Optional) Set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` if you want sale
   notification emails; otherwise leave unset — it degrades gracefully.
5. Deploy the app normally (no ecommerce-specific build step).
6. **Smoke test as a seller:** log in → create a shop
   (`/dashboard/shop`) → add one manual product → connect Stripe in
   **test mode** (`/dashboard/shop/payments`) using your own Stripe test
   keys.
7. **Smoke test as a buyer:** view the product on `/marketplace`, add to
   cart, check out with a Stripe test card (`4242 4242 4242 4242`), confirm
   the order appears on `/orders` (buyer) and
   `/dashboard/shop/orders` (seller).
8. Repeat step 6–7 with PayPal sandbox credentials if you need that path
   too.
9. If sellers will import from Printify/Printful, have one connect a real
   account from `/dashboard/shop/connections` and pull in a test product.
