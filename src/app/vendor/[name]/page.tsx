import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VendorDetail } from "@/components/VendorDetail";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const vendorName = decodeURIComponent(name);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="mb-6">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          back to vendors
        </Link>
      </div>
      <VendorDetail vendorName={vendorName} />
    </main>
  );
}
