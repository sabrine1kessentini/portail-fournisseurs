import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, GitCompareArrows, FileWarning } from "lucide-react";
import { RunAutomationsButton } from "@/components/buyer/run-automations-button";

export default async function DashboardPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const [atRiskLines, pendingValidations, expiringDocs] = await Promise.all([
    prisma.orderLine.findMany({
      where: { status: { in: ["date_proposed", "disputed"] } },
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
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{d.buyerDashboard.title}</h1>
        <RunAutomationsButton isFr={locale === "fr"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          icon={AlertTriangle}
          label={d.buyerDashboard.atRiskOrders}
          count={atRiskLines.length}
        />
        <SummaryCard
          icon={GitCompareArrows}
          label={d.buyerDashboard.pendingValidations}
          count={pendingValidations.length}
        />
        <SummaryCard
          icon={FileWarning}
          label={d.buyerDashboard.expiringDocuments}
          count={expiringDocs.length}
        />
      </div>

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
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{line.order.reference}</p>
                  <p className="text-muted-foreground">{line.order.supplier.name}</p>
                </div>
                <Badge variant={line.status === "disputed" ? "destructive" : "secondary"}>
                  {d.lineStatus[line.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{d.buyerDashboard.expiringDocuments}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringDocs.length === 0 && <EmptyState locale={locale} />}
            {expiringDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/acheteur/commandes/${doc.orderId}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{d.documentType[doc.type]}</p>
                  <p className="text-muted-foreground">{doc.supplier.name}</p>
                </div>
                <Badge variant={doc.status === "expired" ? "destructive" : "secondary"}>
                  {d.documentStatus[doc.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ locale }: { locale: "fr" | "en" }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      {locale === "fr" ? "Rien à signaler." : "Nothing to report."}
    </p>
  );
}
