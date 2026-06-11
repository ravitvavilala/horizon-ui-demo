import { ClientsTable } from "@/components/clients/ClientsTable";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-client P&L roll-up. Drill in for monthly history.
        </p>
      </header>
      <ClientsTable />
    </div>
  );
}
