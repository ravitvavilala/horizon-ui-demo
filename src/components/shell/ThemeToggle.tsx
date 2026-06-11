"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Labeled light/dark switcher · says the mode out loud per user request. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes is undefined on the server; render a stable placeholder
  // until mounted so SSR markup matches the first client render.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = !mounted || theme !== "light";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 px-2 text-xs sm:px-3">
          {isDark ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
          {/* Label hidden on phones (icon only) · keeps the top bar from
              crowding; SSR + first client render agree (isDark defaults
              true) so the button never resizes after mount. */}
          <span className="hidden sm:inline">
            {isDark ? "Dark mode" : "Light mode"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Moon data-icon="inline-start" />
            Light mode
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Sun data-icon="inline-start" />
            Dark mode
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
