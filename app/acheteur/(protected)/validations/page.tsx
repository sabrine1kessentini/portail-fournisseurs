import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiffDecisionForm } from "@/components/buyer/diff-decision-form";
import { ImpactBadge } from "@/components/buyer/impact-badge";

export default async function ValidationsPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const pending = await prisma.orderLineHistory.findMany({
    where: { validationStatus: "pending" },
    include: { orderLine: { include: { order: { include: { supplier: true } } } } },
    orderBy: { changedAt: "asc" },
  });

  function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{d.nav.validations}</h1>

      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {locale === "fr" ? "Rien à valider pour le moment." : "Nothing to validate right now."}
        </p>
      )}

      <div className="space-y-3">
        {pending.map((history) => (
          <Card key={history.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link
                  href={`/acheteur/commandes/${history.orderLine.orderId}`}
                  className="hover:underline"
                >
                  {history.orderLine.order.reference}
                </Link>{" "}
                <span className="text-muted-foreground">
                  · {history.orderLine.order.supplier.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm font-medium">{history.orderLine.designation}</p>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {d.buyerDashboard.diffOld}
                  </p>
                  <p className="line-through opacity-70">
                    {history.field === "requestedDate" ? formatDate(history.oldValue) : history.oldValue}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {d.buyerDashboard.diffNew}
                  </p>
                  <p className="font-medium">
                    {history.field === "requestedDate" ? formatDate(history.newValue) : history.newValue}
                  </p>
                </div>
                <DiffDecisionForm historyId={history.id} dict={d} />
              </div>
              {history.field === "requestedDate" && (
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-xs uppercase text-muted-foreground">
                    {d.buyerDashboard.impactLabel}
                  </span>
                  <ImpactBadge oldIso={history.oldValue!} newIso={history.newValue!} dict={d} />
                </p>
              )}
              {history.reason && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {d.supplierPortal.reason} : {history.reason}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
