import { ConsultantsTable } from "@/components/consultants/ConsultantsTable";

export const dynamic = "force-dynamic";

export default function ConsultantsPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Consultants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every consultant that generated revenue in the period. Search,
          filter by type or company, sort by any column.
        </p>
      </header>
      <ConsultantsTable />
    </div>
  );
}
