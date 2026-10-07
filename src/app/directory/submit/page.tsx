import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import DirectoryListingForm from "@/components/DirectoryListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submit a business | Mompuffs" };

export default async function SubmitBusinessPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl">
      <Link href="/directory" className="text-sm text-brand-600 hover:underline">
        ← Business Directory
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Submit a business</h1>
      <p className="text-sm text-gray-500 mb-5">
        Know a great dispensary, smoke shop, MMJ doctor or something fun? Add it to the directory.
      </p>
      {user ? (
        <DirectoryListingForm isAdmin={Boolean((user as any).isAdmin)} />
      ) : (
        <div className="bg-white rounded-xl shadow p-6 text-sm">
          <p className="mb-3">You need a Mompuffs account to submit a business.</p>
          <div className="flex gap-2">
            <Link href="/login" className="bg-brand-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-brand-700">
              Log in
            </Link>
            <Link href="/register" className="text-brand-700 font-semibold px-4 py-2 rounded-full hover:bg-brand-50">
              Sign up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
