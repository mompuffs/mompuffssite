export type HelpTopic = {
  slug: string;
  title: string;
  href: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; steps?: string[]; note?: string }[];
};

export const SHOP_HELP_TOPICS: HelpTopic[] = [
  {
    slug: "products",
    title: "My Shop / products",
    href: "/dashboard/shop",
    summary: "Add products, edit them, filter by category, and page through your catalog.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["My Shop is your product catalog. New items show on the public shop and marketplace as soon as you add them."],
      },
      {
        heading: "How to use it",
        paragraphs: [],
        steps: [
          "Use Add a product at the top to create a single item (title, price, image, categories).",
          "The grid shows 20 products per page. Use Prev / Next under the grid to move through pages.",
          "Use the Category dropdown above the grid to show only one category, or Uncategorized.",
          "Under each photo: Title, Description, Categories, Shipping, Video, or Remove. Changes save on that product only.",
          "Remove archives the product so it leaves the public shop but old orders still keep their line items.",
        ],
      },
    ],
  },
  {
    slug: "orders",
    title: "Orders",
    href: "/dashboard/shop/orders",
    summary: "See paid orders that include your products and mark your items fulfilled.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Orders lists sales that include products from your shop. On a multi-vendor cart you only manage your own line items."],
      },
      {
        heading: "How to use it",
        paragraphs: [],
        steps: [
          "Open an order to see the buyer, shipping address, items, tax, and shipping.",
          "When you have shipped or handed off print-on-demand production, mark your items fulfilled.",
          "Refund requests from buyers appear under Refunds, not here.",
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund requests",
    href: "/dashboard/shop/refunds",
    summary: "Approve or deny a buyer refund request. Money still moves in Stripe or PayPal.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Buyers can request a refund. You approve or deny the request here. Approving does not automatically send money back — you still refund in the processor you connected (Stripe Dashboard or PayPal)."],
      },
      {
        heading: "How to use it",
        paragraphs: [],
        steps: [
          "Open Refunds and read the buyer note and order items.",
          "Approve or deny the request so the buyer sees a status.",
          "If you approve, log into Stripe or PayPal and issue the refund there so the customer is actually paid back.",
        ],
      },
    ],
  },
  {
    slug: "categories",
    title: "Categories",
    href: "/dashboard/shop/categories",
    summary: "Build the category tree customers use on your public shop page.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Categories organize your catalog on the public shop (All Products plus your tree in the left column)."],
      },
      {
        heading: "How to use it",
        paragraphs: [],
        steps: [
          "Add a top-level category (for example Apparel).",
          "Optionally add a child under it (for example Apparel → Hoodies). One level of nesting is enough for the public shop.",
          "On My Shop or Import, assign products to one or more categories. Unassigned products only show under All Products.",
        ],
      },
    ],
  },
  {
    slug: "import",
    title: "Import products",
    href: "/dashboard/shop/import",
    summary: "Bring in products from a connected catalog, a public website, or a CSV file.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Import copies products into your MomPuffs shop. Connected catalogs need keys on Import Connectors first. Website and CSV imports do not."],
      },
      {
        heading: "From a connected catalog",
        paragraphs: ["Save the source under Import Connectors, then open Import and click that source's button. Set categories on a card and click Import to my shop."],
        note: "If the catalog fails to load, the usual cause is a missing or expired key under Import Connectors. Open Help → Import Connectors for where to copy each key.",
      },
      {
        heading: "From a website",
        paragraphs: [
          "Paste a public shop or category URL (for example a Peaprint collection page), set how many products to pull, and click Find products. No login to the other site is required.",
          "Duplicates of the same source URL are skipped so you do not import the same listing twice.",
        ],
        steps: [
          "Use a listing or collection page, not a homepage with no product links.",
          "If only some products appear, raise the count and try again, or paste a more specific category URL.",
          "Sites that block scrapers or require login will not preview. Use CSV for those.",
        ],
      },
      {
        heading: "From a CSV file",
        paragraphs: [],
        steps: [
          "Click Download CSV template and fill title, price, image URL, and optional description.",
          "Categories: separate several with a semicolon. Nest one level with >  (example: Household > Cups and Mugs). Missing category names are created.",
          "Upload the file and click Upload & import. Skipped rows list a reason under the result.",
        ],
      },
    ],
  },
  {
    slug: "connections",
    title: "Import Connectors",
    href: "/dashboard/shop/connections",
    summary: "Connect Shopify, BigCommerce, Wix, Square, Stripe, Printify, or Printful so Import can load that catalog.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Import Connectors is only for product import. These keys let Import products pull a catalog from another site. They are not payment keys (those live under Payments). Each shop enters its own keys. MomPuffs does not use a platform-wide key."],
      },
      {
        heading: "Printify",
        paragraphs: [],
        steps: [
          "Log in at printify.com with the store you want to import from.",
          "Open Connections in the left menu (or go to https://printify.com/app/connections).",
          "Choose Printify API and generate a Personal access token. Copy it once — Printify may not show it again.",
          "Open My Shops, click the shop, and copy the numeric Shop ID from the page or URL.",
          "On MomPuffs Import Connectors, Connect Printify, paste the token and Shop ID, and Save.",
        ],
      },
      {
        heading: "Printful",
        paragraphs: [],
        steps: [
          "Log in at printful.com.",
          "Open Settings → Stores / API (or https://www.printful.com/dashboard/settings).",
          "Under API, create a private token and copy it.",
          "On MomPuffs Import Connectors, Connect Printful, paste the token, and Save.",
        ],
      },
      {
        heading: "Shopify",
        paragraphs: [],
        steps: [
          "Log in to the Shopify admin for the store you want to import.",
          "Go to Settings → Apps and sales channels → Develop apps. Allow custom app development if Shopify asks.",
          "Create an app. Under Admin API integration, enable read access for Products.",
          "Install the app and reveal the Admin API access token (starts with shpat_). Copy it once.",
          "Your shop domain is the .myshopify.com address (example: your-store.myshopify.com).",
          "On MomPuffs Import Connectors, Connect Shopify, paste the access token and shop domain, and Save.",
        ],
        note: "A custom app token is required. The storefront password or a staff login will not work.",
      },
      {
        heading: "BigCommerce",
        paragraphs: [],
        steps: [
          "Log in to the BigCommerce control panel.",
          "Go to Settings → API → Store-level API accounts (or Settings → API accounts).",
          "Create an API account with Products read-only (or modify) access. Copy the Access token.",
          "The Store hash is the short code in API paths, like api.bigcommerce.com/stores/abcdefg — copy abcdefg only.",
          "On MomPuffs Import Connectors, Connect BigCommerce, paste the access token and store hash, and Save.",
        ],
      },
      {
        heading: "Wix",
        paragraphs: [],
        steps: [
          "Log in at https://manage.wix.com and open the site that has the products.",
          "Site ID: Settings → Site details, or the siteId= value in the dashboard URL. Copy that ID.",
          "API key: go to https://manage.wix.com/account/api-keys (Account settings → API keys). Create a key with Wix Stores permissions.",
          "On MomPuffs Import Connectors, Connect Wix, paste the API key and Site ID, and Save.",
        ],
        note: "The account API key must be allowed to access that specific site.",
      },
      {
        heading: "Square catalog",
        paragraphs: ["This is the Square product catalog, not the Payments connection. You can reuse the same access token."],
        steps: [
          "Log in at https://developer.squareup.com/apps and open your application.",
          "Copy the Access token for Production (real catalog) or Sandbox (test catalog).",
          "On MomPuffs Import Connectors, Connect Square, paste the token, and type production or sandbox to match. Save.",
        ],
      },
      {
        heading: "Stripe catalog",
        paragraphs: ["This reads Products and Prices from Stripe. The secret key can be the same one you saved under Payments."],
        steps: [
          "Log in at https://dashboard.stripe.com.",
          "Open Developers → API keys. Reveal and copy the Secret key (sk_live_ or sk_test_).",
          "On MomPuffs Import Connectors, Connect Stripe, paste that secret key, and Save.",
        ],
        note: "sk_test_ only lists test-mode products. Use sk_live_ for the live catalog.",
      },
      {
        heading: "After you connect",
        paragraphs: ["Go to Import products and click the same source name to load the catalog. Disconnect here if you need to rotate a key."],
      },
    ],
  },
  {
    slug: "payments",
    title: "Payments",
    href: "/dashboard/shop/payments",
    summary: "Connect Stripe, PayPal, or Square so checkout can charge your account.",
    sections: [
      {
        heading: "What this page is",
        paragraphs: ["Checkout can only take money if this shop has at least one processor connected. Keys stay on your shop; other vendors cannot use them."],
      },
      {
        heading: "Stripe",
        paragraphs: ["You need both a publishable key and a secret key from the same Stripe account."],
        steps: [
          "Log in at https://dashboard.stripe.com.",
          "Turn on View live data in the dashboard if you want real charges (off = test keys only).",
          "Open Developers → API keys.",
          "Copy the Publishable key (starts with pk_live_ or pk_test_).",
          "Reveal and copy the Secret key (starts with sk_live_ or sk_test_). Never share this.",
          "On MomPuffs Payments, Connect Stripe and paste Secret Key then Publishable Key. Save.",
        ],
        note: "pk_test_ / sk_test_ only work with Stripe test cards. Use live keys for real customers.",
      },
      {
        heading: "PayPal",
        paragraphs: ["You need a REST app Client ID and Secret from the PayPal Developer Dashboard."],
        steps: [
          "Log in at https://developer.paypal.com/dashboard/ and open Apps & Credentials.",
          "Choose Sandbox to test, or Live for real payments.",
          "Create an app (or open an existing one). Copy Client ID and Secret.",
          "On MomPuffs Payments, Connect PayPal. Paste Client ID, Client Secret, and type sandbox or live to match the app you copied. Save.",
        ],
        note: "Sandbox credentials will not charge real buyers. Live credentials will.",
      },
      {
        heading: "Square",
        paragraphs: [],
        steps: [
          "Log in at https://developer.squareup.com/apps and open your application.",
          "Copy the Access token for Sandbox or Production.",
          "Open Locations and copy the Location ID you want charges to hit.",
          "On MomPuffs Payments, Connect Square, paste both, and Save.",
        ],
      },
      {
        heading: "Another processor",
        paragraphs: ["Use Add another processor for something like Authorize.net. Enter a display name, the API key or secret from that provider's control panel, and any extra login id or endpoint they give you."],
      },
    ],
  },
  {
    slug: "coupons",
    title: "Coupons",
    href: "/dashboard/shop/coupons",
    summary: "Create promo codes that only discount your shop's items.",
    sections: [{ heading: "How to use it", paragraphs: [], steps: ["Create a code, choose percent or fixed amount, and set any limits you offer.", "At checkout the code only reduces your products, even if the cart also has another shop's items.", "Tax is calculated after the discount on your subtotal."] }],
  },
  {
    slug: "shipping",
    title: "Shipping",
    href: "/dashboard/shop/shipping",
    summary: "Set a shop-wide flat rate. Override it on individual products if needed.",
    sections: [{ heading: "How to use it", paragraphs: [], steps: ["Set the shop flat rate on Shipping. That is the default for every product.", "On a product card, open Shipping and choose Shop's flat rate, Custom for this product, or Free shipping.", "Checkout adds one shipping amount for the shop in the cart."] }],
  },
  {
    slug: "tax",
    title: "Sales tax",
    href: "/dashboard/shop/tax",
    summary: "Add rates that apply to the buyer's shipping address at checkout.",
    sections: [
      {
        heading: "How to use it",
        paragraphs: [],
        steps: [
          "Add a rate with a name (for example Missouri sales tax) and a percent (for example 4.225).",
          "Country US and state MO (or Missouri) match a Missouri shipping address. Use * in a field to match any value.",
          "Checkout quotes tax on the Review step after the address is filled in, and charges that amount.",
          "A rate for TX will not apply to a MO address. If tax shows $0.00, the rate's country/state do not match what the buyer typed.",
        ],
        note: "You are responsible for charging the rates that apply to your business. MomPuffs only applies the rows you save.",
      },
    ],
  },
  {
    slug: "settings",
    title: "Shop settings",
    href: "/dashboard/shop/admin-settings",
    summary: "Change shop name, description, and banner. The URL slug does not change.",
    sections: [{ heading: "How to use it", paragraphs: ["Update the public name, about text, and banner image. The shop URL (/shop/your-slug) stays the same so existing links keep working."] }],
  },
];

export function getHelpTopic(slug: string) {
  return SHOP_HELP_TOPICS.find((t) => t.slug === slug) ?? null;
}
