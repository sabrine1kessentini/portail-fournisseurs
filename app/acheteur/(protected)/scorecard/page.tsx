import Link from "next/link";
import { ClipboardCheck, ShieldCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { getAllSuppliersScorecards } from "@/lib/scorecard";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrendIndicator } from "@/components/ui/trend-indicator";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CircularScore } from "@/components/buyer/circular-score";
import { rateTone, scoreTier, type StatusTone } from "@/lib/status-color";

const TIER_TONE: Record<string, StatusTone> = {
  at_risk: "danger",
  fair: "warning",
  good: "success",
  excellent: "success",
};

function pct(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function ScorecardPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const scorecards = await getAllSuppliersScorecards();

  const tierLabel = {
    at_risk: d.scorecard.tierAtRisk,
    fair: d.scorecard.tierFair,
    good: d.scorecard.tierGood,
    excellent: d.scorecard.tierExcellent,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {locale === "fr" ? "Performance fournisseurs" : "Supplier performance"}
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight">{d.scorecard.title}</h1>
        <p className="text-sm text-muted-foreground">{d.scorecard.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scorecards.map((s) => {
          const tier = scoreTier(s.onTimeRate);
          // Disputes are already the complement of complianceRate (see lib/scorecard.ts) —
          // reusing it here for the bar keeps the display consistent with that same number,
          // rather than inventing a second, independent "dispute rate".
          const disputeRate = s.complianceRate === null ? null : 1 - s.complianceRate;

          return (
            <Card key={s.supplierId}>
              <CardContent className="space-y-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/acheteur/fournisseurs/${s.supplierId}`}
                    className="group flex min-w-0 items-center gap-1 font-medium hover:underline"
                  >
                    <span className="truncate">{s.supplierName}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tone={TIER_TONE[tier]}>{tierLabel[tier]}</StatusBadge>
                    <CircularScore value={s.onTimeRate} tone={rateTone(s.onTimeRate)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <MetricRow
                    icon={ClipboardCheck}
                    label={d.scorecard.onTimeRate}
                    value={s.onTimeRate}
                  />
                  <MetricRow
                    icon={ShieldCheck}
                    label={d.scorecard.complianceRate}
                    value={s.complianceRate}
                  />
                  <MetricRow icon={AlertTriangle} label={d.scorecard.disputes} value={disputeRate} />
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">{d.scorecard.trend}</span>
                  <TrendIndicator value={s.onTimeTrend} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </span>
        <span className="font-mono font-medium tabular-nums">{pct(value)}</span>
      </div>
      <ProgressBar value={value ?? 0} tone={rateTone(value)} />
    </div>
  );
}
