"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MorningHero() {
  const { data, isLoading } = useQuery({
    queryKey: ["briefing", "morning"],
    queryFn: api.getMorningBriefing,
    staleTime: 1000 * 60 * 5,
  });

  const dateLabel = data
    ? new Date(data.as_of + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "-";

  const bullets = (data?.lines ?? []).filter((l) => l.kind !== "alert");
  const alerts = (data?.lines ?? []).filter((l) => l.kind === "alert");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{dateLabel}</Badge>
          <Badge variant="outline">Morning briefing</Badge>
        </div>
        <CardTitle className="text-2xl">Yesterday at a glance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 text-sm leading-relaxed",
                  i === 0
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {b.text}
              </li>
            ))}
          </ul>
        )}

        {alerts.length > 0 && (
          <div className="mt-3 flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{alerts[0].text}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
