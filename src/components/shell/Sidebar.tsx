"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building,
  Building2,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  Receipt,
  ReceiptText,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building },
  { href: "/consultants", label: "Consultants", icon: Users },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/customers", label: "Customers", icon: Handshake },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/billing", label: "Billing", icon: ReceiptText },
  { href: "/ar", label: "AR", icon: Receipt },
  { href: "/insights", label: "Insights", icon: Lightbulb },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center px-2 py-2.5">
          <span className="truncate font-heading text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Horizon
          </span>
          <span className="hidden font-heading text-lg font-bold group-data-[collapsible=icon]:inline">
            H
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/50">
            Profit desk
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="lg"
                      className="rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 data-[active=true]:font-semibold data-[active=true]:shadow-sm [&>a]:gap-3 [&_svg]:size-[18px]"
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
