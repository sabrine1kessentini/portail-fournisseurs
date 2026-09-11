import { prisma } from "@/lib/prisma";
import { createMagicLink, buildMagicLinkUrl } from "@/lib/auth/supplier";
import { sendGroupedReminder, sendBuyerNotification } from "@/lib/email";
import { computeDocumentStatus } from "@/lib/documents";
import { hasRecentDigest, recordDigest } from "./digest-guard";

/**
 * W3 — "Document expirant" : recalcule le statut de chaque document selon sa
 * date d'expiration, bloque la réception si un document requis est expiré,
 * puis envoie une relance groupée (J-15) ou une escalade (J-5, copie
 * acheteur) par fournisseur — jamais un email par document.
 */
export async function refreshDocumentStatuses() {
  const documents = await prisma.document.findMany({
    where: { expiresAt: { not: null }, status: { not: "superseded" } },
    include: { supplier: true, order: { include: { createdBy: true } } },
  });

  let expiredNewly = 0;
  const bySupplierSoon = new Map<string, typeof documents>();
  const bySupplierUrgent = new Map<string, typeof documents>();

  for (const doc of documents) {
    const nextStatus = computeDocumentStatus(doc.expiresAt);
    if (nextStatus !== doc.status) {
      await prisma.document.update({ where: { id: doc.id }, data: { status: nextStatus } });
      if (nextStatus === "expired") {
        expiredNewly++;
        await prisma.orderLine.updateMany({
          where: { orderId: doc.orderId },
          data: { receptionBlocked: true },
        });
      }
    }

    if (nextStatus === "expiring_soon") {
      const list = bySupplierSoon.get(doc.supplierId) ?? [];
      list.push(doc);
      bySupplierSoon.set(doc.supplierId, list);
    } else if (nextStatus === "expiring_urgent") {
      const list = bySupplierUrgent.get(doc.supplierId) ?? [];
      list.push(doc);
      bySupplierUrgent.set(doc.supplierId, list);
    }
  }

  let remindersSent = 0;
  let escalationsSent = 0;

  for (const [supplierId, docs] of bySupplierSoon) {
    if (await hasRecentDigest(supplierId, "document_expiring_soon")) continue;
    await sendSupplierDigest(supplierId, docs, "document_expiring_soon", false);
    remindersSent++;
  }

  for (const [supplierId, docs] of bySupplierUrgent) {
    if (await hasRecentDigest(supplierId, "document_expiring_urgent")) continue;
    await sendSupplierDigest(supplierId, docs, "document_expiring_urgent", true);
    escalationsSent++;
  }

  return { documentsScanned: documents.length, expiredNewly, remindersSent, escalationsSent };
}

async function sendSupplierDigest(
  supplierId: string,
  docs: Array<{
    id: string;
    type: string;
    expiresAt: Date | null;
    order: { reference: string; createdBy: { id: string; email: string; locale: "fr" | "en" } };
  }>,
  alertType: "document_expiring_soon" | "document_expiring_urgent",
  urgent: boolean
) {
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const anyBuyer = docs[0].order.createdBy;

  const { token } = await createMagicLink({
    supplierId,
    orderId: null,
    createdById: docs[0].order.createdBy.id,
  });

  await sendGroupedReminder({
    to: supplier.email,
    locale: supplier.locale,
    urgent,
    magicLinkUrl: buildMagicLinkUrl(token),
    items: docs.map((d) => ({
      label: d.order.reference,
      detail: d.expiresAt ? new Date(d.expiresAt).toLocaleDateString(supplier.locale) : undefined,
    })),
  });

  await recordDigest(supplierId, alertType, { documentIds: docs.map((d) => d.id) });

  if (urgent) {
    await sendBuyerNotification({
      to: anyBuyer.email,
      locale: anyBuyer.locale,
      subject: `Urgent — documents ${supplier.name} expirant sous 5 jours`,
      bodyHtml: `<p>${docs.length} document(s) du fournisseur <strong>${supplier.name}</strong> expirent sous 5 jours et bloqueront la réception si non renouvelés.</p>`,
    });
  }
}
