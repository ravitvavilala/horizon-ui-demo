import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ClientDetail } from "@/components/clients/ClientDetail";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ masterId: string }>;
}) {
  const { masterId } = await params;
  return (
    <div className="space-y-4 px-6 py-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to clients
      </Link>
      <ClientDetail masterId={decodeURIComponent(masterId)} />
    </div>
  );
}
