export type VisitorHelpTopic = {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; steps?: string[]; note?: string }[];
};

export const VISITOR_HELP_TOPICS: VisitorHelpTopic[] = [
  {
    slug: "account",
    title: "Account and profile",
    summary: "Create an account, edit your profile, and change email or password.",
    sections: [
      {
        heading: "Sign up and log in",
        paragraphs: [],
        steps: [
          "Open Sign up in the top menu, choose a username, email, and password.",
          "Log in from the same menu. Use Forgot password on the login page if you need a reset email.",
          "Sign out is the last item in the top menu when you are logged in.",
        ],
      },
      {
        heading: "My Profile vs My Account",
        paragraphs: [],
        steps: [
          "My Profile is the public page other people see (posts, about, friends).",
          "My Account is where you edit display name, photo, about, work, location, and what is visible.",
          "Check Show on profile next to About me and the other blocks so they appear on My Profile.",
          "Username (the @name in the URL) cannot be changed.",
        ],
      },
      {
        heading: "Email and password",
        paragraphs: ["On My Account you can change login email or password. Either change signs you out so you can log in with the new details."],
      },
    ],
  },
  {
    slug: "feed",
    title: "Feed and posts",
    summary: "Read the home feed, post, comment, and react.",
    sections: [
      {
        heading: "How the feed works",
        paragraphs: ["Feed is the home page after you log in. You see posts from people and groups you can access."],
        steps: [
          "Write in the composer at the top of the feed to post. Use + Emoji to add an emotion in the text.",
          "Add a photo or video if the composer offers those fields.",
          "React with an emotion under the post, or comment.",
        ],
      },
    ],
  },
  {
    slug: "groups",
    title: "Groups",
    summary: "Create groups, choose public or private, join, and post.",
    sections: [
      {
        heading: "Create a group",
        paragraphs: [],
        steps: [
          "Open Groups and click + Create group.",
          "Enter a name. Topic, description, and photo are optional.",
          "Visibility: Public means anyone can see the group's posts in the feed and on the group page. Private means only members see posts.",
          "Joining: Open lets people join instantly. Approval required means you accept or decline each request.",
          "Click Create group. You become the owner and can manage it from the group page.",
        ],
        note: "A group can be Public with approval, or Private and open. Visibility controls who sees posts; joining controls who can become a member.",
      },
      {
        heading: "Find and join groups",
        paragraphs: [],
        steps: [
          "Browse or search Groups by name or topic.",
          "Open a group and Join (or Request to join if approval is required).",
          "Post inside a group so members see it. Private group posts do not show to the whole site.",
        ],
      },
    ],
  },
  {
    slug: "friends",
    title: "Friends and messages",
    summary: "Add friends, manage requests, and send messages.",
    sections: [
      {
        heading: "Friends",
        paragraphs: [],
        steps: [
          "Open someone's profile and use the friend button to send a request.",
          "Incoming requests show on My Account in the right column. Accept or decline there.",
          "You can block someone from your profile. Blocked people are listed on My Account so you can unblock.",
        ],
      },
      {
        heading: "Messages",
        paragraphs: ["Open Messages in the menu to see conversations. Unread counts show on the Messages link. Start a thread from a profile when that option is available."],
      },
    ],
  },
  {
    slug: "marketplace",
    title: "Marketplace and shops",
    summary: "Browse products, filter by shop or category, and open a seller's page.",
    sections: [
      {
        heading: "Finding products",
        paragraphs: [],
        steps: [
          "Open Marketplace to see products from every shop.",
          "Use the left shop list to show one shop, or open a shop page from that list.",
          "On a shop page, use the category list to narrow products. Pages show 20 products at a time.",
          "Click a product card for photos, description, price, and Add to cart.",
        ],
      },
    ],
  },
  {
    slug: "checkout",
    title: "Cart and checkout",
    summary: "Add items, apply a coupon, pay, and see tax and shipping.",
    sections: [
      {
        heading: "Cart",
        paragraphs: ["Cart in the menu holds items from one or more shops until you check out."],
      },
      {
        heading: "Checkout",
        paragraphs: [],
        steps: [
          "Enter the shipping address. Tax is quoted from that address on the Review step.",
          "Shipping is added per shop in the cart.",
          "A coupon only discounts products from the shop that created the code.",
          "Pay with the processor that shop connected (Stripe or PayPal).",
          "After payment you can open your orders from My Account → View your orders.",
        ],
        note: "If tax shows $0.00, that shop may not have a rate for your state yet.",
      },
    ],
  },
  {
    slug: "orders",
    title: "Orders and refunds",
    summary: "Find past orders and ask a seller for a refund.",
    sections: [
      {
        heading: "Your orders",
        paragraphs: ["My Account has a link to order history. Each order lists the shop, items, tax, and shipping."],
      },
      {
        heading: "Refunds",
        paragraphs: [
          "If an order allows a refund request, submit it from the order. The seller approves or denies it.",
          "Approved requests still have to be refunded in Stripe or PayPal by the seller. Allow time for that.",
        ],
      },
    ],
  },
  {
    slug: "selling",
    title: "Opening a shop",
    summary: "How visitors become sellers on MomPuffs.",
    sections: [
      {
        heading: "Start selling",
        paragraphs: [],
        steps: [
          "Log in and open My Shop in the menu.",
          "Create the shop (name and public page).",
          "Add products yourself, or import from a catalog / website / CSV.",
          "Connect a payment processor so checkout can charge your account.",
        ],
        note: "Seller how-tos live under My Shop → Help & Support after your shop exists.",
      },
    ],
  },
];

export function getVisitorHelpTopic(slug: string) {
  return VISITOR_HELP_TOPICS.find((t) => t.slug === slug) ?? null;
}
