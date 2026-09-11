import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateLinkButton } from "@/components/buyer/generate-link-button";
import { RevokeLinkButton } from "@/components/buyer/revoke-link-button";
import { CancelOrderButton } from "./cancel-order-button";
import { ReceiveLineButton } from "./receive-line-button";
import { DiffDecisionForm } from "@/components/buyer/diff-decision-form";
import { Download, FileWarning } from "lucide-react";

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
      lines: { include: { history: { orderBy: { changedAt: "desc" } } }, orderBy: { createdAt: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      magicLinks: { where: { orderId: id }, include: { accesses: true } },
    },
  });
  if (!order) notFound();

  const pendingDiffs = order.lines.flatMap((line) =>
    line.history.filter((h) => h.validationStatus === "pending").map((h) => ({ line, history: h }))
  );

  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{order.reference}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/acheteur/fournisseurs/${order.supplier.id}`} className="hover:underline">
              {order.supplier.name}
            </Link>{" "}
            · {order.currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isCancelled ? "destructive" : "outline"}>{d.orderStatus[order.status]}</Badge>
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
              <div key={history.id} className="rounded-md border p-4">
                <p className="mb-2 text-sm font-medium">{line.designation}</p>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{d.buyerDashboard.diffOld}</p>
                    <p className="line-through opacity-70">
                      {history.field === "requestedDate"
                        ? formatDate(new Date(history.oldValue!), locale)
                        : history.oldValue}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{d.buyerDashboard.diffNew}</p>
                    <p className="font-medium text-foreground">
                      {history.field === "requestedDate"
                        ? formatDate(new Date(history.newValue!), locale)
                        : history.newValue}
                    </p>
                  </div>
                  <DiffDecisionForm historyId={history.id} dict={d} />
                </div>
                {history.reason && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {d.supplierPortal.reason} : {history.reason}
                  </p>
                )}
              </div>
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
                    <Badge variant={line.status === "disputed" ? "destructive" : "secondary"}>
                      {d.lineStatus[line.status]}
                    </Badge>
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
        </CardContent>
      </Card>

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
                  <Badge variant={doc.status === "expired" ? "destructive" : "secondary"}>
                    {d.documentStatus[doc.status]}
                  </Badge>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isFr ? "Lien fournisseur (cette commande)" : "Supplier link (this order)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.magicLinks
              .filter((l) => !l.revoked && l.expiresAt > new Date())
              .map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {isFr ? "Expire le" : "Expires"} {formatDate(link.expiresAt, locale)}
                  </span>
                  <RevokeLinkButton
                    magicLinkId={link.id}
                    redirectPath={`/acheteur/commandes/${order.id}`}
                    label={d.buyerDashboard.revokeLink}
                  />
                </div>
              ))}
            <GenerateLinkButton
              supplierId={order.supplierId}
              orderId={order.id}
              label={d.buyerDashboard.generateLink}
              copiedLabel={d.buyerDashboard.linkCopied}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
