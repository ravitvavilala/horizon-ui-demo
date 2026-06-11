"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Simple prev/next pager shown under long tables. */
export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
      <span>
        {from}-{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page + 1} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={onPrev}
          disabled={page <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={onNext}
          disabled={page >= pageCount - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
