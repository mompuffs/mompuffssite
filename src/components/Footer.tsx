import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-6">
      <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-gray-500 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} Mompuffs</span>
        <Link href="/privacy" className="hover:text-brand-600 hover:underline">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
