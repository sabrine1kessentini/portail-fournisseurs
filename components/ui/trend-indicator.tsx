import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "cn";
import type { StatusTone } from "@/lib/status-color";

const toneTextClasses: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

/**
 * Generalized version of the scorecard page's inline TrendBadge — routes
 * up/down/flat through the shared StatusTone system instead of a hardcoded
 * text-emerald-600 (previously the app's only non-token color).
 */
export function TrendIndicator({
  value,
  format = "points",
  className,
}: {
  value: number | null;
  format?: "points" | "percent";
  className?: string;
}) {
  if (value === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  const tone: StatusTone = value > 0 ? "success" : value < 0 ? "danger" : "neutral";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const magnitude = Math.abs(Math.round(value * 100));
  const label = format === "percent" ? `${magnitude}%` : `${magnitude} pts`;

  return (
    <span className={cn("flex items-center gap-1 text-sm font-medium tabular-nums", toneTextClasses[tone], className)}>
      <Icon className="size-4" />
      {label}
    </span>
  );
}
