import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, GitCompareArrows, FileWarning } from "lucide-react";
import { RunAutomationsButton } from "@/components/buyer/run-automations-button";
import { KpiCard } from "@/components/buyer/kpi-card";
import { DocumentUrgencyChart } from "@/components/buyer/document-urgency-chart";
import { ChangeDiffCard } from "@/components/buyer/change-diff-card";
import { SupplierWatchlist } from "@/components/buyer/supplier-watchlist";
import { bucketDocumentsByUrgency, getWatchlistSuppliers } from "@/lib/dashboard-metrics";
import { lineStatusTone, documentStatusTone } from "@/lib/status-color";
import { getAllSuppliersScorecards } from "@/lib/scorecard";
import { initials } from "@/lib/initials";

export default async function DashboardPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const [atRiskLines, pendingValidations, expiringDocs, scorecards] = await Promise.all([
    prisma.orderLine.findMany({
      where: { status: { in: ["date_proposed", "quantity_proposed", "disputed"] } },
      include: { order: { include: { supplier: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.orderLineHistory.findMany({
      where: { validationStatus: "pending" },
      include: { orderLine: { include: { order: { include: { supplier: true } } } } },
      orderBy: { changedAt: "desc" },
      take: 8,
    }),
    prisma.document.findMany({
      where: { status: { in: ["expiring_soon", "expiring_urgent", "expired"] } },
      include: { supplier: true, order: true },
      orderBy: { expiresAt: "asc" },
      take: 8,
    }),
    getAllSuppliersScorecards(),
  ]);

  const urgencyBuckets = bucketDocumentsByUrgency(expiringDocs, d.documentStatus);
  const watchlist = getWatchlistSuppliers(scorecards, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {locale === "fr" ? "Centre de pilotage achats" : "Procurement command center"}
          </p>
          <h1 className="font-heading text-3xl font-normal tracking-tight">{d.buyerDashboard.title}</h1>
        </div>
        <RunAutomationsButton isFr={locale === "fr"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={AlertTriangle}
          label={d.buyerDashboard.atRiskOrders}
          value={atRiskLines.length}
          tone={atRiskLines.length > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          icon={GitCompareArrows}
          label={d.buyerDashboard.pendingValidations}
          value={pendingValidations.length}
          tone={pendingValidations.length > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          icon={FileWarning}
          label={d.buyerDashboard.expiringDocuments}
          value={expiringDocs.length}
          tone={expiringDocs.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {watchlist.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">{d.buyerDashboard.watchlistTitle}</h2>
          <SupplierWatchlist suppliers={watchlist} disputesLabel={d.buyerDashboard.disputesCount} />
        </div>
      )}

      {pendingValidations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">{d.buyerDashboard.pendingValidations}</h2>
          <div className="space-y-3">
            {pendingValidations.map((history) => (
              <ChangeDiffCard
                key={history.id}
                line={history.orderLine}
                history={history}
                dict={d}
                locale={locale}
                showOrderContext={{
                  reference: history.orderLine.order.reference,
                  supplierName: history.orderLine.order.supplier.name,
                  href: `/acheteur/commandes/${history.orderLine.orderId}`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{d.buyerDashboard.atRiskOrders}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskLines.length === 0 && <EmptyState locale={locale} />}
            {atRiskLines.map((line) => (
              <Link
                key={line.id}
                href={`/acheteur/commandes/${line.orderId}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-accent"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium ${
                      lineStatusTone(line.status) === "danger"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {initials(line.order.supplier.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.order.reference}</p>
                    <p className="truncate text-muted-foreground">{line.order.supplier.name}</p>
                  </div>
                </div>
                <StatusBadge tone={lineStatusTone(line.status)}>{d.lineStatus[line.status]}</StatusBadge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{d.buyerDashboard.expiringDocuments}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expiringDocs.length === 0 && <EmptyState locale={locale} />}
            {urgencyBuckets.length > 0 && <DocumentUrgencyChart data={urgencyBuckets} />}
            <div className="space-y-3">
              {expiringDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/acheteur/commandes/${doc.orderId}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15 font-mono text-[11px] font-medium text-warning">
                      {initials(doc.supplier.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.documentType[doc.type]}</p>
                      <p className="truncate text-muted-foreground">{doc.supplier.name}</p>
                    </div>
                  </div>
                  <StatusBadge tone={documentStatusTone(doc.status)}>
                    {d.documentStatus[doc.status]}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ locale }: { locale: "fr" | "en" }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      {locale === "fr" ? "Rien à signaler." : "Nothing to report."}
    </p>
  );
}
