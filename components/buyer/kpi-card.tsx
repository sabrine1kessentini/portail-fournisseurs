import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import type { StatusTone } from "@/lib/status-color";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-primary/10 text-primary",
};

/**
 * Replaces the dashboard's inline SummaryCard: same count semantics, a
 * tinted icon chip instead of always-primary, and the figure rendered in
 * Geist Mono for a deliberate "dashboard data" numeric treatment.
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
    <CardContent className="flex items-center gap-4 pt-6">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", toneClasses[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Card className="transition-colors hover:bg-accent/50">
        <Link href={href}>{content}</Link>
      </Card>
    );
  }

  return <Card>{content}</Card>;
}
