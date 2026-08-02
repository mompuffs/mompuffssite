export type PaymentFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  password?: boolean;
};

export type BuiltinPaymentProvider = {
  slug: string;
  provider: "STRIPE" | "PAYPAL" | "SQUARE";
  label: string;
  fields: PaymentFieldDef[];
};

// The "apiKey" field is always the primary secret, stored in the dedicated
// (encrypted) apiKey column; every other field lands in the encrypted
// "extra" JSON blob. Field order here is the order shown in the connect form.
export const BUILTIN_PAYMENT_PROVIDERS: BuiltinPaymentProvider[] = [
  {
    slug: "stripe",
    provider: "STRIPE",
    label: "Stripe",
    fields: [
      { key: "apiKey", label: "Secret Key", placeholder: "sk_live_...", password: true },
      { key: "publishableKey", label: "Publishable Key", placeholder: "pk_live_..." },
    ],
  },
  {
    slug: "paypal",
    provider: "PAYPAL",
    label: "PayPal",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "apiKey", label: "Client Secret", password: true },
      { key: "environment", label: "Environment: \"sandbox\" or \"live\"", placeholder: "sandbox" },
    ],
  },
  {
    slug: "square",
    provider: "SQUARE",
    label: "Square",
    fields: [
      { key: "apiKey", label: "Access Token", password: true },
      { key: "locationId", label: "Location ID" },
    ],
  },
];

// Fields collected for a custom processor (e.g. Authorize.net) beyond its
// user-chosen display name.
export const CUSTOM_PAYMENT_FIELDS: PaymentFieldDef[] = [
  { key: "apiKey", label: "API Key / Secret", password: true },
  { key: "details", label: "Additional details (optional)", placeholder: "e.g. API Login ID, endpoint URL" },
];
