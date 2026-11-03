import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Minus, Equal, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface DiffEntry {
  id: string;
  timestamp: Date;
  prompt: string;
  diffs: {
    html: DiffLine[];
    css: DiffLine[];
    js: DiffLine[];
  };
  stats: { added: number; removed: number; unchanged: number };
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = buildLCS(oldLines, newLines);
  let oi = 0, ni = 0, li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length && oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ type: "unchanged", content: oldLines[oi], lineNumber: ni + 1 });
      oi++; ni++; li++;
    } else if (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
      result.push({ type: "removed", content: oldLines[oi], lineNumber: oi + 1 });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ type: "added", content: newLines[ni], lineNumber: ni + 1 });
      ni++;
    }
  }
  return result;
}

function buildLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  // For performance, limit to 500 lines each
  if (m > 500 || n > 500) {
    // Fallback: just mark everything as changed
    return [];
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

function DiffStats({ stats }: { stats: DiffEntry["stats"] }) {
  return (
    <div className="flex gap-2 text-xs">
      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
        <Plus className="w-3 h-3 mr-1" />+{stats.added}
      </Badge>
      <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30">
        <Minus className="w-3 h-3 mr-1" />-{stats.removed}
      </Badge>
      <Badge variant="outline" className="text-muted-foreground">
        <Equal className="w-3 h-3 mr-1" />{stats.unchanged}
      </Badge>
    </div>
  );
}

function DiffBlock({ lines, label }: { lines: DiffLine[]; label: string }) {
  const [open, setOpen] = useState(false);
  const hasChanges = lines.some(l => l.type !== "unchanged");
  if (!hasChanges) return null;

  const changedLines = lines.filter(l => l.type !== "unchanged");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 px-2 rounded hover:bg-muted text-sm font-medium">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
        <span className="text-xs text-muted-foreground ml-auto">{changedLines.length} lignes modifiées</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="font-mono text-xs border rounded mt-1 overflow-x-auto max-h-60 overflow-y-auto">
          {lines.map((line, i) => {
            if (line.type === "unchanged") return null;
            return (
              <div
                key={i}
                className={`px-2 py-0.5 whitespace-pre ${
                  line.type === "added"
                    ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                    : "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300"
                }`}
              >
                <span className="select-none text-muted-foreground mr-2 inline-block w-4">
                  {line.type === "added" ? "+" : "-"}
                </span>
                {line.content}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DiffViewerProps {
  history: DiffEntry[];
  onClear: () => void;
}

export function DiffViewer({ history, onClear }: DiffViewerProps) {
  if (history.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">Diffs</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{history.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des modifications IA
            </DialogTitle>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                Vider
              </Button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {history.slice().reverse().map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-2">"{entry.prompt}"</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {entry.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <DiffStats stats={entry.stats} />
                <div className="space-y-1">
                  <DiffBlock lines={entry.diffs.html} label="HTML" />
                  <DiffBlock lines={entry.diffs.css} label="CSS" />
                  <DiffBlock lines={entry.diffs.js} label="JavaScript" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
