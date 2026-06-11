"use client";

import { usePathname } from "next/navigation";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login is a standalone full-screen page · no sidebar / topbar chrome.
  if (pathname === "/login") {
    return <>{children}</>;
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
