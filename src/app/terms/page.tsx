import Link from "next/link";

export const metadata = {
  title: "Terms of Use — Mompuffs",
  description: "The terms that govern your use of Mompuffs.",
};

const LAST_UPDATED = "August 5, 2026";

export default function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">Terms of Use</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>
      </div>

      <p className="text-gray-700">
        These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of Mompuffs
        (&ldquo;Mompuffs,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
        including our social feed, groups, messaging, and marketplace features (together, the
        &ldquo;Service&rdquo;). By creating an account or otherwise using the Service, you
        agree to these Terms. If you don&rsquo;t agree, please don&rsquo;t use the Service.
      </p>

      <Section title="1. Eligibility">
        <p className="text-gray-700">
          You must be at least 18 years old to use Mompuffs. Our marketplace includes
          age-restricted products, and by using the Service you represent that you meet the
          minimum age required to view and purchase such products where you live.
        </p>
      </Section>

      <Section title="2. Your account">
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>You&rsquo;re responsible for the accuracy of the information you provide and for keeping your password secure.</li>
          <li>You&rsquo;re responsible for all activity that happens under your account.</li>
          <li>Notify us right away if you suspect unauthorized use of your account.</li>
          <li>One account per person. Don&rsquo;t create an account for anyone else without permission, or on behalf of someone under 18.</li>
        </ul>
      </Section>

      <Section title="3. Your content">
        <p className="text-gray-700">
          You retain ownership of the posts, comments, photos, videos, messages, and product
          listings you submit to Mompuffs (&ldquo;your content&rdquo;). By posting content, you
          grant Mompuffs a non-exclusive, worldwide, royalty-free license to host, store,
          display, reproduce, and distribute it solely for the purpose of operating and
          improving the Service (for example, showing your post in a friend&rsquo;s feed, or
          your product listing in the marketplace). This license ends when you delete the
          content, except for copies already shared with others or retained as required by
          law.
        </p>
        <p className="text-gray-700 mt-2">
          You&rsquo;re solely responsible for your content and confirm you have the right to
          post it.
        </p>
      </Section>

      <Section title="4. Prohibited conduct">
        <p className="text-gray-700 mb-2">You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>Post content that is illegal, harassing, hateful, defamatory, or infringes someone else&rsquo;s rights.</li>
          <li>List or sell products that are illegal, counterfeit, stolen, or that violate applicable age restrictions.</li>
          <li>Impersonate another person or misrepresent your affiliation with anyone.</li>
          <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service or other users&rsquo; accounts.</li>
          <li>Use the Service to send spam, scrape data, or engage in fraud.</li>
          <li>Circumvent any blocking, moderation, or age-verification features.</li>
        </ul>
        <p className="text-gray-700 mt-2">
          We may remove content or suspend or terminate accounts that violate these Terms, at
          our discretion.
        </p>
      </Section>

      <Section title="5. Marketplace, orders &amp; payments">
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>
            <strong>Independent sellers:</strong> shops on Mompuffs are run by individual
            users, not by Mompuffs. Mompuffs is not the seller of record for marketplace
            products and is not responsible for product quality, accuracy of listings, or
            fulfillment.
          </li>
          <li>
            <strong>Payments:</strong> payments are processed by third-party providers (Stripe
            and/or PayPal) subject to their own terms. We don&rsquo;t store your full payment
            card details.
          </li>
          <li>
            <strong>Shipping &amp; fulfillment:</strong> orders are shipped by the individual
            shop owner, or via a print-on-demand partner they&rsquo;ve connected (such as
            Printful or Printify). Shipping times and methods vary by seller.
          </li>
          <li>
            <strong>Refunds:</strong> refund requests are submitted to and handled by the shop
            owner. Mompuffs facilitates the request but does not process the refund itself.
          </li>
          <li>
            <strong>Seller responsibilities:</strong> if you sell on Mompuffs, you&rsquo;re
            responsible for the legality and accuracy of your listings, fulfilling orders, and
            complying with applicable laws (including age-restriction and tax laws) in the
            jurisdictions you sell to.
          </li>
        </ul>
      </Section>

      <Section title="6. Intellectual property">
        <p className="text-gray-700">
          The Mompuffs name, logo, and Service (excluding user content) are owned by Mompuffs
          or its licensors and protected by intellectual property laws. You may not copy,
          modify, or use them without our prior written permission.
        </p>
      </Section>

      <Section title="7. Third-party links &amp; services">
        <p className="text-gray-700">
          The Service may link to or integrate with third-party services (payment processors,
          print-on-demand partners, etc.). We aren&rsquo;t responsible for the content,
          policies, or practices of any third-party service.
        </p>
      </Section>

      <Section title="8. Disclaimers">
        <p className="text-gray-700">
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied. We don&rsquo;t warrant that the Service
          will be uninterrupted, error-free, or secure, or that any product listed on the
          marketplace is accurate, safe, or legal in your jurisdiction.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p className="text-gray-700">
          To the fullest extent permitted by law, Mompuffs will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of
          profits or data, arising from your use of the Service. Our total liability for any
          claim relating to the Service will not exceed the amount you paid us, if any, in the
          12 months before the claim arose.
        </p>
      </Section>

      <Section title="10. Indemnification">
        <p className="text-gray-700">
          You agree to indemnify and hold Mompuffs harmless from any claims, damages, or
          expenses (including reasonable legal fees) arising from your content, your use of
          the Service, or your violation of these Terms.
        </p>
      </Section>

      <Section title="11. Termination">
        <p className="text-gray-700">
          You may stop using the Service and delete your account at any time. We may suspend
          or terminate your access to the Service, with or without notice, if we believe
          you&rsquo;ve violated these Terms or created risk or legal exposure for us or other
          users.
        </p>
      </Section>

      <Section title="12. Changes to these Terms">
        <p className="text-gray-700">
          We may update these Terms from time to time. If we make material changes,
          we&rsquo;ll update the &ldquo;Last updated&rdquo; date above and, where appropriate,
          notify you directly. Continuing to use the Service after changes take effect means
          you accept the updated Terms.
        </p>
      </Section>

      <Section title="13. Contact us">
        <p className="text-gray-700">
          Questions about these Terms? Reach us via our{" "}
          <Link href="/contact" className="text-brand-600 hover:underline">
            Contact page
          </Link>{" "}
          or at{" "}
          <a href="mailto:info@mompuffs.com" className="text-brand-600 hover:underline">
            info@mompuffs.com
          </a>
          .
        </p>
      </Section>

      <p className="text-xs text-gray-400">
        See also our{" "}
        <Link href="/privacy" className="text-brand-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
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
