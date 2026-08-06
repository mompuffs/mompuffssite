import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/contact", label: "Contact" },
];

// Same links as the site footer -- mirrored here since the footer sits
// below the fold on most pages and isn't always convenient to reach. Lives
// in the right rail (PageShell.tsx), which spaces its children via its own
// flex gap, so no margin here.
export default function SidebarLegalLinks() {
  return (
    <div className="bg-white rounded-xl shadow p-3">
      <div className="space-y-0.5">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
