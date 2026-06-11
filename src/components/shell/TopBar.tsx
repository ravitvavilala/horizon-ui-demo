"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { CompanyToggle } from "@/components/shell/CompanyToggle";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard";
import { DEMO } from "@/lib/api";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/companies": "Companies",
  "/consultants": "Consultants",
  "/clients": "Clients",
  "/customers": "Customers",
  "/company": "Company",
  "/vendor": "Vendor",
  "/vendors": "Vendors",
  "/billing": "Billing",
  "/ar": "Accounts Receivable",
  "/insights": "Insights",
};

export function TopBar() {
  const pathname = usePathname();
  const setShowCommandPalette = useDashboardStore(
    (s) => s.setShowCommandPalette,
  );

  const base = "/" + (pathname.split("/")[1] ?? "");
  const title = PAGE_TITLES[base] ?? PAGE_TITLES["/"]!;

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {DEMO && (
        <span
          title="Public showcase build. Every figure is synthetic — no real company data, no database connected."
          className="ml-1 hidden cursor-help rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 sm:inline"
        >
          Demo · synthetic data
        </span>
      )}

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        className="hidden h-8 w-48 justify-start gap-2 text-muted-foreground md:flex"
        onClick={() => setShowCommandPalette(true)}
      >
        <Search data-icon="inline-start" />
        <span className="flex-1 text-left text-xs">Search…</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>

      {/* Light/Dark mode switcher (labeled) */}
      <ThemeToggle />

      {/* Top-right company pill toggle - Phase 6 */}
      <CompanyToggle />
    </header>
  );
}
