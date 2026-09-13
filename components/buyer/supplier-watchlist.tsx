import Link from "next/link";
import { TrendIndicator } from "@/components/ui/trend-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { initials } from "@/lib/initials";
import { rateTone, type StatusTone } from "@/lib/status-color";
import type { SupplierScorecard } from "@/lib/scorecard";

const AVATAR_TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-foreground",
};

export function SupplierWatchlist({
  suppliers,
  disputesLabel,
}: {
  suppliers: SupplierScorecard[];
  disputesLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {suppliers.map((s) => {
        const tone = rateTone(s.onTimeRate);
        return (
          <Link
            key={s.supplierId}
            href={`/acheteur/fournisseurs/${s.supplierId}`}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${AVATAR_TONE_CLASS[tone]}`}
              >
                {initials(s.supplierName)}
              </span>
              <p className="min-w-0 truncate text-sm font-medium">{s.supplierName}</p>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-2xl font-semibold tabular-nums">
                {Math.round((s.onTimeRate ?? 0) * 100)}%
              </span>
              <TrendIndicator value={s.onTimeTrend} />
            </div>
            {s.disputes > 0 && (
              <StatusBadge tone="danger" className="w-fit">
                {s.disputes} {disputesLabel}
              </StatusBadge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
