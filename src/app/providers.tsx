"use client";

import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * App-level client providers. Apple-smooth defaults:
 *   - placeholderData=keepPreviousData → no skeleton flash when company
 *     toggle or year dropdown changes; old data stays visible until new
 *     arrives, then crossfades.
 *   - staleTime 10min → no refetch on quick page revisits.
 *   - gcTime 1hr → cache stays warm across the whole session.
 *   - refetchOnMount false → trust the cache.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            placeholderData: keepPreviousData,
            staleTime: 10 * 60_000,
            gcTime: 60 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
