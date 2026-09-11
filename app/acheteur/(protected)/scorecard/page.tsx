import { getAllSuppliersScorecards } from "@/lib/scorecard";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

function pct(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function ScorecardPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";
  const scorecards = await getAllSuppliersScorecards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{d.scorecard.title}</h1>
        <p className="text-sm text-muted-foreground">
          {isFr
            ? "Calculé sur les 90 derniers jours, comparé à la période précédente."
            : "Computed over the last 90 days, compared to the previous period."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scorecards.map((s) => (
          <Card key={s.supplierId}>
            <CardHeader>
              <CardTitle className="text-base">{s.supplierName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label={d.scorecard.onTimeRate} value={pct(s.onTimeRate)} />
              <Row label={d.scorecard.complianceRate} value={pct(s.complianceRate)} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{d.scorecard.disputes}</span>
                <Badge variant={s.disputes > 0 ? "destructive" : "secondary"}>{s.disputes}</Badge>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground">{d.scorecard.trend}</span>
                <TrendBadge trend={s.onTimeTrend} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return <span className="text-muted-foreground">—</span>;
  const isUp = trend >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${isUp ? "text-emerald-600" : "text-destructive"}`}>
      <Icon className="size-4" />
      {Math.abs(Math.round(trend * 100))} pts
    </span>
  );
}
