"use client";

/**
 * ChatWidget - floating bottom-right text-to-SQL chat.
 *
 * - 56px circular toggle button at bottom-right.
 * - Click opens 380×560 panel above the toggle.
 * - shadcn primitives only.
 * - Bedrock-backed via POST /read/chat/sql.
 * - SQL displayed in collapsible <pre>, rows in mini-table.
 * - Conversation history in Zustand (in-memory).
 */

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X, Database, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import { api, type AskSqlMessage } from "@/lib/api";
import { useChatStore, type ChatMessage } from "@/stores/chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const EXAMPLES = [
  "Top 5 consultants by revenue this year",
  "Combined revenue last month per company",
  "Vendors with lowest match rate",
  "Margin trend by employment type",
];

export function ChatWidget() {
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const toggle = useChatStore((s) => s.toggle);
  const messages = useChatStore((s) => s.messages);
  const input = useChatStore((s) => s.input);
  const setInput = useChatStore((s) => s.setInput);
  const pushMessage = useChatStore((s) => s.pushMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const sending = useChatStore((s) => s.sending);
  const setSending = useChatStore((s) => s.setSending);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
      if (e.metaKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, toggle]);

  // Focus + scroll bottom on open / new msg
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: question.trim(),
    };
    const placeholderId = makeId();
    pushMessage(userMsg);
    pushMessage({
      id: placeholderId,
      role: "assistant",
      content: "",
      pending: true,
    });
    setInput("");
    setSending(true);

    const history: AskSqlMessage[] = messages
      .filter((m) => !m.pending)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const resp = await api.askSql({ question: question.trim(), history });
      updateMessage(placeholderId, {
        pending: false,
        content: resp.rationale || (resp.sql ? "Here's what I found." : "I couldn't answer that."),
        sql: resp.sql,
        rationale: resp.rationale,
        rows: resp.rows,
        columnNames: resp.column_names,
        error: resp.error,
        tookMs: resp.took_ms,
      });
    } catch (err) {
      updateMessage(placeholderId, {
        pending: false,
        content: "Request failed.",
        error: String(err),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close chat" : "Open chat"}
        className={cn(
          "fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "ipad:bottom-6 ipad:right-6",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Panel */}
      {open && (
        <Card
          className={cn(
            "fixed bottom-20 right-4 z-50 flex w-[380px] flex-col overflow-hidden shadow-2xl",
            "max-h-[min(640px,calc(100vh-6rem))] h-[560px]",
            "max-md:bottom-4 max-md:right-4 max-md:left-4 max-md:w-auto max-md:h-[calc(100vh-7rem)]",
          )}
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Ask Horizon</div>
              <Badge variant="outline" className="text-[10px]">
                ⌘J
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
            {messages.length === 0 ? (
              <EmptyExamples onPick={(q) => send(q)} />
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in plain English…"
                disabled={sending}
                className="text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={sending || !input.trim()}
                className="shrink-0"
              >
                {sending ? (
                  <span className="h-3 w-3 animate-pulse rounded-full bg-current" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Read-only · Ask about revenue, margin, clients, or vendors
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function EmptyExamples({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-stretch gap-2 py-6">
      <div className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        Try asking
      </div>
      {EXAMPLES.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onPick(q)}
          className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs text-foreground/85 transition-colors hover:bg-muted hover:text-foreground"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [showSql, setShowSql] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.pending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {msg.content && (
        <div className="text-sm text-foreground/90">{msg.content}</div>
      )}

      {msg.error && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertTitle className="text-xs">Error</AlertTitle>
          <AlertDescription className="text-[11px] break-all">
            {msg.error}
          </AlertDescription>
        </Alert>
      )}

      {msg.sql && (
        <div className="rounded-md border border-border/60 bg-muted/30">
          <button
            type="button"
            onClick={() => setShowSql((v) => !v)}
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showSql ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-mono">SQL</span>
            {msg.tookMs ? (
              <span className="ml-auto tabular-nums">{msg.tookMs}ms</span>
            ) : null}
          </button>
          {showSql && (
            <pre className="overflow-x-auto border-t border-border/60 px-2 py-2 font-mono text-[10px] text-foreground/85">
              {msg.sql}
            </pre>
          )}
        </div>
      )}

      {msg.rows && msg.rows.length > 0 && msg.columnNames && (
        <ResultsTable rows={msg.rows} cols={msg.columnNames} />
      )}
    </div>
  );
}

function ResultsTable({
  rows,
  cols,
}: {
  rows: Array<Record<string, unknown>>;
  cols: string[];
}) {
  const limited = rows.slice(0, 20);
  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/40">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="px-2 py-1 text-left font-medium uppercase tracking-wider text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {limited.map((row, i) => (
            <tr key={i} className="border-t border-border/40">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1 tabular-nums">
                  {formatCell(row[c], c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && (
        <div className="border-t border-border/60 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
          showing first 20 of {rows.length} rows
        </div>
      )}
    </div>
  );
}

// Money column names. margin_pct / *_pct are caught by the percent check
// first, so plain "margin" / "gross_margin" here stay currency.
const MONEY_RE =
  /revenue|expense|cost|margin|pay|bill|received|outstanding|tax|fee|holdback|recovery|spend|referral|salary|gross|amount|profit|rate/;
// Identifier / ordinal columns that are NEVER money · render as plain ints
// (consultant_id, client_master_id, application_number, year, month, *_count).
const ID_RE = /(^|_)id$|_id$|consultant_id|number|^year$|^month$|count|_sk$/;

function formatCell(v: unknown, col?: string): string {
  if (v === null || v === undefined) return "-";
  if (typeof v !== "number") return String(v);
  const c = (col ?? "").toLowerCase();

  if (c.includes("pct") || c.includes("percent")) return `${v.toFixed(1)}%`;
  // IDs / years / counts: integer, no currency, no thousands separator
  if (ID_RE.test(c)) return String(Math.round(v));
  if (c.includes("hour")) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (MONEY_RE.test(c)) {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  }
  // Unknown numeric: plain, with separators
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
