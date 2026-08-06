import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>© Copyright 2026 MomPuffs. All rights reserved.</span>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-brand-600 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-brand-600 hover:underline">
            Terms of Use
          </Link>
          <Link href="/contact" className="hover:text-brand-600 hover:underline">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
