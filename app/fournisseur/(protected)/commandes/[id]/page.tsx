import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSupplierSession } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { LineActionForm } from "./line-action-form";
import { DocumentUploadForm } from "./document-upload-form";
import { OrderProgressHeader } from "@/components/supplier/order-progress-header";
import { summarizeLineProgress } from "@/lib/order-progress";
import { lineStatusTone, documentStatusTone } from "@/lib/status-color";

function formatDate(d: Date | null, locale: string) {
  return d ? d.toLocaleDateString(locale) : "—";
}

export default async function SupplierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSupplierSession();
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  if (session.scopedOrderId && session.scopedOrderId !== id) {
    redirect("/fournisseur");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!order || order.supplierId !== session.supplierId) notFound();

  const isCancelled = order.status === "cancelled";
  const replaceableDocs = order.documents.filter(
    (doc) => doc.status === "expired" || doc.status === "expiring_urgent" || doc.status === "expiring_soon"
  );

  const progress = summarizeLineProgress(order.lines);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="font-heading text-3xl font-normal tracking-tight">{order.reference}</h1>
          <p className="text-sm text-muted-foreground">{order.currency}</p>
        </div>
        <OrderProgressHeader progress={progress} isFr={isFr} className="max-w-sm" />
      </div>

      {isCancelled && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {d.supplierPortal.cancelledBanner}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium">{d.supplierPortal.orderLines}</h2>
        {order.lines.map((line) => (
          <Card key={line.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{line.designation}</CardTitle>
              <StatusBadge tone={lineStatusTone(line.status)}>{d.lineStatus[line.status]}</StatusBadge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Field label={isFr ? "Quantité" : "Quantity"} value={String(line.quantity)} />
                <Field
                  label={isFr ? "Prix unitaire" : "Unit price"}
                  value={`${line.unitPrice} ${order.currency}`}
                />
                <Field label={d.supplierPortal.requestedDate} value={formatDate(line.requestedDate, locale)} />
                <Field
                  label={d.supplierPortal.confirmedQuantity}
                  value={line.confirmedQuantity != null ? String(line.confirmedQuantity) : "—"}
                />
              </div>

              {!isCancelled && line.status === "pending" && (
                <LineActionForm lineId={line.id} maxQuantity={line.quantity} dict={d} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{d.documentType[doc.type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.expiresAt
                      ? `${d.supplierPortal.expiryDate} : ${formatDate(doc.expiresAt, locale)}`
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

        {!isCancelled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{d.supplierPortal.uploadDocument}</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm
                orderId={order.id}
                dict={d}
                replaceableDocs={replaceableDocs.map((doc) => ({
                  id: doc.id,
                  label: `${d.documentType[doc.type]} — ${doc.fileName}`,
                }))}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
