import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CompanyDetail } from "@/components/CompanyDetail";

const VALID_ENTITIES = new Set(["a", "b"]);
const ENTITY_LABEL: Record<string, string> = {
  a: "Company A",
  b: "Company B",
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!VALID_ENTITIES.has(entity)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground/80"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        back
      </Link>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {ENTITY_LABEL[entity]}
        </h1>
        <p className="mt-1 text-sm text-foreground/50">
          Revenue, expenses, profit, margin - monthly, last 24 months.
        </p>
      </header>

      <CompanyDetail entity={entity as "a" | "b"} />
    </main>
  );
}
