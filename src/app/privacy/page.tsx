import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Mompuffs",
  description: "How Mompuffs collects, uses, and protects your information.",
};

const LAST_UPDATED = "August 5, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>
      </div>

      <p className="text-gray-700">
        This Privacy Policy explains how Mompuffs (&ldquo;Mompuffs,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares information when you
        use our website and services (the &ldquo;Service&rdquo;), including our social feed,
        groups, messaging, and marketplace features. By using the Service, you agree to the
        collection and use of information as described here.
      </p>

      <Section title="1. Information we collect">
        <SubHeading>Information you provide</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>
            <strong>Account information:</strong> email address, username, display name,
            password (stored as a salted hash, never in plain text), and an optional avatar
            image.
          </li>
          <li>
            <strong>Content you post:</strong> posts, comments, photos, videos, group
            descriptions, and private messages you send to other users.
          </li>
          <li>
            <strong>Marketplace information:</strong> if you buy or sell on Mompuffs, we
            collect order details, shipping addresses, and shop information (product
            listings, pricing, coupons). Payments are processed by Stripe and/or PayPal — we
            do not store your full card number or bank details on our servers.
          </li>
          <li>
            <strong>Communications:</strong> messages you send us for support, or information
            you provide when reporting content or requesting a password reset.
          </li>
        </ul>

        <SubHeading>Information collected automatically</SubHeading>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>
            <strong>Usage &amp; presence data:</strong> which pages you visit, and a
            &ldquo;last active&rdquo; timestamp used to show friends when you&rsquo;re online.
          </li>
          <li>
            <strong>Device &amp; log information:</strong> IP address, browser type, and
            similar technical data collected automatically by our hosting and security
            infrastructure.
          </li>
          <li>
            <strong>Cookies:</strong> we use a session cookie to keep you signed in. This
            cookie is required for the Service to function and isn&rsquo;t used for
            third-party advertising or cross-site tracking. We don&rsquo;t currently run any
            analytics or advertising trackers on Mompuffs.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use your information">
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>To create and maintain your account, and to authenticate you when you sign in.</li>
          <li>To operate core features: your feed, groups, messaging, notifications, and the marketplace.</li>
          <li>To process orders, payments, and shipping, and to communicate with you about them (e.g. sale confirmations, shipping updates).</li>
          <li>To send transactional emails, such as password resets — we don&rsquo;t send marketing email unless you ask us to.</li>
          <li>To keep the Service secure, prevent abuse, and enforce our terms.</li>
          <li>To respond to support requests and legal obligations.</li>
        </ul>
      </Section>

      <Section title="3. How we share your information">
        <p className="text-gray-700">We don&rsquo;t sell your personal information. We share it only in these situations:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 mt-2">
          <li>
            <strong>With other users, as intended by the feature:</strong> your public
            profile, posts, comments, and shop listings are visible to other users (or the
            public, for public content); messages are visible to the people you send them to;
            private-group posts are visible only to that group&rsquo;s members.
          </li>
          <li>
            <strong>Service providers who process data on our behalf:</strong> payment
            processing (Stripe, PayPal), transactional email delivery (Resend), hosting and
            infrastructure (Vercel), our database provider, and our media storage service for
            uploaded photos/videos.
          </li>
          <li>
            <strong>Order fulfillment:</strong> if a shop owner fulfills your order through a
            print-on-demand partner (such as Printful or Printify), we share the shipping
            details necessary to produce and ship that order.
          </li>
          <li>
            <strong>Legal reasons:</strong> if required by law, or to protect the rights,
            safety, or property of Mompuffs, our users, or the public.
          </li>
          <li>
            <strong>Business transfers:</strong> if Mompuffs is involved in a merger,
            acquisition, or sale of assets, your information may be transferred as part of
            that transaction.
          </li>
        </ul>
      </Section>

      <Section title="4. Your choices and rights">
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>
            <strong>Access &amp; update:</strong> you can view and edit most of your account
            information any time from{" "}
            <Link href="/account" className="text-brand-600 hover:underline">
              My Account
            </Link>
            .
          </li>
          <li>
            <strong>Delete content:</strong> you can edit or delete your own posts and
            comments at any time.
          </li>
          <li>
            <strong>Account deletion:</strong> to request deletion of your account and
            associated personal data, contact us at the email below. We&rsquo;ll delete or
            anonymize your information except where we&rsquo;re required to keep records (for
            example, completed order/tax records).
          </li>
          <li>
            <strong>Blocking:</strong> you can block other users, which prevents them from
            viewing your profile, messaging you, or interacting with your posts.
          </li>
        </ul>
        <p className="text-gray-700 mt-2">
          Depending on where you live, you may have additional rights under laws like the
          GDPR or CCPA, including the right to request a copy of your data or object to
          certain processing. Contact us to exercise these rights.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p className="text-gray-700">
          We keep your information for as long as your account is active, or as needed to
          provide the Service. If you delete your account, we delete or anonymize your
          personal data within a reasonable time, except where we need to retain it for legal,
          tax, fraud-prevention, or dispute-resolution purposes.
        </p>
      </Section>

      <Section title="6. Data security">
        <p className="text-gray-700">
          We use industry-standard measures to protect your information, including encrypted
          connections (HTTPS), hashed passwords, and access controls on our infrastructure. No
          method of transmission or storage is 100% secure, and we can&rsquo;t guarantee
          absolute security.
        </p>
      </Section>

      <Section title="7. Children's privacy">
        <p className="text-gray-700">
          Mompuffs is not directed to children, and our marketplace includes age-restricted
          products. The Service is not intended for anyone under 18, and we do not knowingly
          collect personal information from anyone under 18. If you believe a minor has
          provided us with personal information, contact us and we&rsquo;ll remove it.
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p className="text-gray-700">
          We may update this Privacy Policy from time to time. If we make material changes,
          we&rsquo;ll update the &ldquo;Last updated&rdquo; date above and, where appropriate,
          notify you directly.
        </p>
      </Section>

      <Section title="9. Contact us">
        <p className="text-gray-700">
          If you have questions about this Privacy Policy or want to exercise your rights over
          your data, contact us at{" "}
          <a href="mailto:info@mompuffs.com" className="text-brand-600 hover:underline">
            info@mompuffs.com
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>;
}
