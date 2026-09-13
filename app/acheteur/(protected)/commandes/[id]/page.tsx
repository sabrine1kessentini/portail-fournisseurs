import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CancelOrderButton } from "./cancel-order-button";
import { ReceiveLineButton } from "./receive-line-button";
import { ChangeDiffCard } from "@/components/buyer/change-diff-card";
import { OrderHistoryTimeline } from "@/components/buyer/order-history-timeline";
import { Download, FileWarning } from "lucide-react";
import { lineStatusTone, documentStatusTone } from "@/lib/status-color";
import { sumOrderValue, formatCurrency } from "@/lib/dashboard-metrics";
import { buildOrderHistoryTimeline } from "@/lib/order-history";

function formatDate(d: Date | null, locale: string) {
  return d ? d.toLocaleDateString(locale) : "—";
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: {
        include: { history: { include: { validatedBy: true }, orderBy: { changedAt: "desc" } } },
        orderBy: { createdAt: "asc" },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!order) notFound();

  const pendingDiffs = order.lines.flatMap((line) =>
    line.history.filter((h) => h.validationStatus === "pending").map((h) => ({ line, history: h }))
  );

  const orderTotal = sumOrderValue(order.lines);
  const historyEntries = buildOrderHistoryTimeline(
    order.lines,
    order.supplier.name,
    d.orderHistory,
    locale
  );

  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-normal tracking-tight">{order.reference}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/acheteur/fournisseurs/${order.supplier.id}`} className="hover:underline">
              {order.supplier.name}
            </Link>{" "}
            · {order.currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={isCancelled ? "danger" : "neutral"}>{d.orderStatus[order.status]}</StatusBadge>
          {!isCancelled && <CancelOrderButton orderId={order.id} isFr={isFr} />}
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {d.supplierPortal.cancelledBanner}
        </div>
      )}

      {pendingDiffs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{d.buyerDashboard.pendingValidations}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDiffs.map(({ line, history }) => (
              <ChangeDiffCard key={history.id} line={line} history={history} dict={d} locale={locale} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">{d.supplierPortal.orderLines}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Désignation" : "Designation"}</th>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Qté" : "Qty"}</th>
                <th className="px-4 py-2.5 font-medium">{d.supplierPortal.requestedDate}</th>
                <th className="px-4 py-2.5 font-medium">{d.supplierPortal.confirmedQuantity}</th>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Statut" : "Status"}</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="px-4 py-2.5">
                    {line.designation}
                    {line.receptionBlocked && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-destructive">
                        <FileWarning className="size-3.5" />
                        {d.supplierPortal.receptionBlocked}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{line.quantity}</td>
                  <td className="px-4 py-2.5">{formatDate(line.requestedDate, locale)}</td>
                  <td className="px-4 py-2.5">{line.confirmedQuantity ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge tone={lineStatusTone(line.status)}>{d.lineStatus[line.status]}</StatusBadge>
                    {line.status === "disputed" && line.reason && (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {d.supplierPortal.reason} : {line.reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {line.status === "confirmed" && !line.receivedAt && (
                      <ReceiveLineButton lineId={line.id} orderId={order.id} isFr={isFr} />
                    )}
                    {line.receivedAt && (
                      <span className="text-xs text-muted-foreground">
                        {isFr ? "Reçu" : "Received"} {formatDate(line.receivedAt, locale)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">{d.buyerDashboard.orderTotal}</span>
            <span className="font-heading text-xl font-normal">
              {formatCurrency(orderTotal, order.currency, locale)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{d.buyerDashboard.historyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderHistoryTimeline entries={historyEntries} emptyLabel={d.buyerDashboard.historyEmpty} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{d.nav.documents}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.documents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isFr ? "Aucun document déposé." : "No documents uploaded."}
            </p>
          )}
          {order.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{d.documentType[doc.type]}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.expiresAt
                    ? `${isFr ? "Expire le" : "Expires"} ${formatDate(doc.expiresAt, locale)}`
                    : doc.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={documentStatusTone(doc.status)}>
                  {d.documentStatus[doc.status]}
                </StatusBadge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href={`/api/documents/${doc.id}/download`} target="_blank" />}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
