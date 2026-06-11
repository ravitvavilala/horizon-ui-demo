import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ConsultantDetail } from "@/components/consultants/ConsultantDetail";

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consultantId = parseInt(id, 10);
  return (
    <div className="space-y-4 px-6 py-6">
      <Link
        href="/consultants"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to consultants
      </Link>
      <ConsultantDetail id={consultantId} />
    </div>
  );
}
