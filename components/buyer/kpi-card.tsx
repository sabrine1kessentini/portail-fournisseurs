import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import type { StatusTone } from "@/lib/status-color";

const toneTextClasses: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

/**
 * Dashboard KPI tile: label + a large, dominant figure (Geist Mono, "dashboard
 * data" treatment) with a small tinted icon tucked in the corner as a subtle
 * category hint rather than the focal point — the number carries the card.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: StatusTone;
  href?: string;
}) {
  const content = (
    <CardContent className="space-y-3 py-1">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <Icon className={cn("size-4", toneTextClasses[tone])} />
      </div>
      <p className="font-mono text-4xl font-semibold tabular-nums">{value}</p>
    </CardContent>
  );

  if (href) {
    return (
      <Card className="py-5 transition-colors hover:bg-accent/50">
        <Link href={href}>{content}</Link>
      </Card>
    );
  }

  return <Card className="py-5">{content}</Card>;
}
