import type { HistoryEntry } from "@/lib/order-history";

const DOT_TONE_CLASS: Record<HistoryEntry["tone"], string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

export function OrderHistoryTimeline({
  entries,
  emptyLabel,
}: {
  entries: HistoryEntry[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 pb-3.5 last:pb-0">
          <div className="flex flex-none flex-col items-center pt-1.5">
            <span className={`size-1.5 shrink-0 rounded-full ${DOT_TONE_CLASS[entry.tone]}`} />
            {i < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="min-w-0 pb-0.5">
            <p className="text-[13px] leading-relaxed text-foreground/85">{entry.text}</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{entry.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
