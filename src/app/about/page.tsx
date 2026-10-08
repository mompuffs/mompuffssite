import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { pageMeta, SITE_URL } from "@/lib/seo";
import { breadcrumbs, organization, ORG_ID } from "@/lib/structuredData";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "About MomPuffs | A Community for Canna-Loving Women",
  description:
    "MomPuffs is a community (mainly) for women who enjoy cannabis: a nationwide directory of dispensaries and smoke shops, member shops, cannabis news and recipes, and a members-only community with no algorithms or bots.",
  path: "/about",
});

export default async function AboutPage() {
  const [listings, licensed, states] = await Promise.all([
    db.businessListing.count({ where: { status: "APPROVED" } }),
    db.businessListing.count({ where: { status: "APPROVED", licenseNumber: { not: null } } }),
    db.businessListing.findMany({ where: { status: "APPROVED" }, distinct: ["state"], select: { state: true } }),
  ]);
  const n = (x: number) => x.toLocaleString("en-US");
  const card = "bg-white rounded-2xl shadow p-5 sm:p-7";
  const h2 = "text-xl sm:text-2xl font-bold text-brand-900 mb-3";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <JsonLd
        items={[
          {
            "@type": "AboutPage",
            "@id": `${SITE_URL}/about#page`,
            url: `${SITE_URL}/about`,
            name: "About MomPuffs",
            about: { "@id": ORG_ID },
          },
          organization(),
          breadcrumbs([{ name: "Home", path: "/" }, { name: "About" }]),
        ]}
      />

      <section className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
        <Image src="/logo.png" alt="MomPuffs" width={250} height={250} className="rounded-full w-32 h-32 sm:w-40 sm:h-40 ring-8 ring-white/15" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">About MomPuffs</h1>
          <p className="mt-3 text-lg font-semibold">Mommy needs a joint should be just as acceptable as Mommy needs a glass of wine!</p>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>Who we are</h2>
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            MomPuffs is a community (mainly) for women who enjoy cannabis. Moms who unwind with a glass of wine get a knowing smile;
            moms who unwind with cannabis too often get a lecture, even where it&apos;s completely legal. We think that&apos;s
            backwards, and we built MomPuffs to be the judgment-free place we wanted for ourselves.
          </p>
          <p>
            It&apos;s a place to find the dispensaries, smoke shops and canna-friendly businesses near you, shop from member-run stores,
            catch up on cannabis news, recipes and honest articles, and connect with other members who get it.
          </p>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>Meet Mel, founder of MomPuffs</h2>
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            I&apos;m a lifetime cannabis smoker. I&apos;ve never been much of a drinker and never liked alcohol much; I was always the
            stoner in my group of friends.
          </p>
          <p>
            At 33 I was diagnosed with fibromyalgia. I had quit smoking for a job, and within a month I was basically bedridden. For
            the next three years I was prescribed 16 to 20 pills a day. I couldn&apos;t function on them, and they were injuring my
            organs. In 2003 I quit all of them, and I haven&apos;t looked back.
          </p>
          <p>
            I never thought weed would be legal in my lifetime, yet here we are! I&apos;ve been a cannabis activist for decades now, and
            my goal with MomPuffs is to help get rid of the stigma we live with because we choose a plant over alcohol and drugs.
          </p>
          <p className="font-semibold text-brand-800">– Mel</p>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>What you&apos;ll find here</h2>
        <ul className="space-y-4 text-gray-700">
          <li>
            <Link href="/directory" className="font-bold text-brand-700 hover:underline">
              📍 The business directory
            </Link>
            <p className="mt-1">
              {n(listings)} dispensaries, smoke and vape shops and medical marijuana doctors across {states.length} states and
              territories, on an interactive map with addresses, phone numbers, websites and directions. Browse by{" "}
              <Link href="/dispensaries" className="text-brand-600 hover:underline">
                state and city
              </Link>
              .
            </p>
          </li>
          <li>
            <Link href="/marketplace" className="font-bold text-brand-700 hover:underline">
              🛍️ The marketplace
            </Link>
            <p className="mt-1">
              Canna-themed apparel, accessories, home goods and gifts from member-run shops, including our own{" "}
              <Link href="/shop/mompuffs" className="text-brand-600 hover:underline">
                MomPuffs shop
              </Link>
              . MomPuffs doesn&apos;t sell cannabis, and cannabis and cannabis products cannot be sold in any stores on
              MomPuffs.
            </p>
          </li>
          <li>
            <Link href="/blog" className="font-bold text-brand-700 hover:underline">
              📰 The blog
            </Link>
            <p className="mt-1">Cannabis news, recipes, health guides and state-by-state law explainers, written for women and moms.</p>
          </li>
          <li>
            <Link href="/register" className="font-bold text-brand-700 hover:underline">
              💬 The community
            </Link>
            <p className="mt-1">
              A members-only feed, groups, friends and private messages. Joining is free, and what you share stays with members.
            </p>
          </li>
        </ul>
      </section>

      <section className={card}>
        <h2 className={h2}>What we stand for</h2>
        <ul className="space-y-3 text-gray-700">
          <li>
            <span className="font-semibold">No algorithms or bots.</span> Your feed shows posts from the people and groups you
            chose, newest first. Nothing is boosted or buried by an algorithm.
          </li>
          <li>
            <span className="font-semibold">Privacy first.</span> The community is members-only. The feed, groups and member
            profiles aren&apos;t shown to the public or to search engines. And we never sell your information.
          </li>
          <li>
            <span className="font-semibold">Judgment-free.</span> Adults making legal choices about cannabis deserve the same respect as
            anyone pouring a drink.
          </li>
          <li>
            <span className="font-semibold">Honest information.</span> We cite our sources and keep directory data as accurate as we can
            (see below).
          </li>
        </ul>
      </section>

      <section className={card}>
        <h2 className={h2}>Where directory information comes from</h2>
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            Listings come from business owners, MomPuffs members, the open map projects OpenStreetMap and Overture Maps, and official
            state licensing data. {licensed > 0 && <>{n(licensed)} dispensaries are matched to their state&apos;s official licensed-dispensary list and show a green &ldquo;Licensed&rdquo; badge with the license number. </>}
            Each listing credits where its information came from.
          </p>
          <p>
            Own a business that&apos;s listed? You can{" "}
            <Link href="/directory" className="text-brand-600 hover:underline">
              claim it for free
            </Link>{" "}
            to update the details. Not listed yet?{" "}
            <Link href="/directory/submit" className="text-brand-600 hover:underline">
              Add it
            </Link>
            . Spot something wrong?{" "}
            <Link href="/contact" className="text-brand-600 hover:underline">
              Let us know
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="text-sm text-gray-500 px-1 space-y-2">
        <p>
          MomPuffs is for adults. Cannabis laws vary by state and change often; nothing on this site is legal or medical advice. Please
          follow the laws where you live.
        </p>
        <p>
          Questions? Write to{" "}
          <a href="mailto:info@mompuffs.com" className="text-brand-600 hover:underline">
            info@mompuffs.com
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="text-brand-600 hover:underline">
            contact form
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
