import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VendorsTable } from "@/components/VendorsTable";
import { SRC } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default function VendorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          back to overview
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          subvendor margin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend = {SRC.ap} vendor-cost ledger, 100% books-reconciled -
          accurate for every vendor. Revenue + margin shown only where we
          matched (nearly) all of a vendor&apos;s bills to {SRC.staffing}
          client billing for the same period; otherwise the row is
          spend-only. We don&apos;t show a margin we can&apos;t stand behind.
        </p>
      </header>
      <VendorsTable />
    </main>
  );
}
