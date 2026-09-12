import { cn } from "cn";
import type { LineProgress } from "@/lib/order-progress";

/**
 * Small "N/total confirmed" readout with a segmented progress bar, shared by
 * the supplier's order list and order detail pages. Pure presentation over
 * an already-computed LineProgress — no new data fetching.
 */
export function OrderProgressHeader({
  progress,
  isFr,
  className,
}: {
  progress: LineProgress;
  isFr: boolean;
  className?: string;
}) {
  const { total, confirmed, disputed } = progress;
  if (total === 0) return null;

  const confirmedPct = (confirmed / total) * 100;
  const disputedPct = (disputed / total) * 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">
          {confirmed}/{total} {isFr ? "lignes confirmées" : "lines confirmed"}
        </span>
        {disputed > 0 && (
          <span className="text-destructive">
            {disputed} {isFr ? "litige(s)" : "dispute(s)"}
          </span>
        )}
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success" style={{ width: `${confirmedPct}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${disputedPct}%` }} />
      </div>
    </div>
  );
}
