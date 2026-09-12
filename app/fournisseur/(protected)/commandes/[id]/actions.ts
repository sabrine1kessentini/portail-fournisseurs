"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSupplierSession } from "@/lib/auth/guards";
import { lineConfirmationSchema, documentUploadSchema } from "@/lib/validations";
import { uploadDocument } from "@/lib/storage";
import { computeDocumentStatus } from "@/lib/documents";
import { sendBuyerNotification } from "@/lib/email";

export interface FormState {
  error?: string;
  success?: boolean;
}

async function assertOwnedOrder(orderId: string, supplierId: string, scopedOrderId: string | null) {
  if (scopedOrderId && scopedOrderId !== orderId) {
    throw new Error("Accès refusé à cette commande.");
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.supplierId !== supplierId) {
    throw new Error("Accès refusé à cette commande.");
  }
  return order;
}

export async function confirmLineAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSupplierSession();

  const parsed = lineConfirmationSchema.safeParse({
    orderLineId: formData.get("orderLineId"),
    action: formData.get("action"),
    confirmedQuantity: formData.get("confirmedQuantity") || undefined,
    proposedDate: formData.get("proposedDate") || undefined,
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const line = await prisma.orderLine.findUnique({
    where: { id: parsed.data.orderLineId },
    include: { order: { include: { createdBy: true, supplier: true } } },
  });
  if (!line) return { error: "Ligne introuvable." };

  try {
    await assertOwnedOrder(line.orderId, session.supplierId, session.scopedOrderId);
  } catch {
    return { error: "Accès refusé." };
  }

  if (line.order.status === "cancelled") {
    return { error: "Cette commande est annulée." };
  }
  if (line.status !== "pending") {
    return { error: "Cette ligne a déjà été traitée." };
  }

  if (parsed.data.action === "accept") {
    const confirmedQuantity = parsed.data.confirmedQuantity ?? line.quantity;
    await prisma.orderLine.update({
      where: { id: line.id },
      data: {
        confirmedQuantity,
        status: confirmedQuantity < line.quantity ? "partially_confirmed" : "confirmed",
      },
    });
  } else if (parsed.data.action === "propose_date") {
    await prisma.$transaction([
      prisma.orderLine.update({
        where: { id: line.id },
        data: {
          proposedDate: parsed.data.proposedDate,
          reason: parsed.data.reason,
          status: "date_proposed",
        },
      }),
      prisma.orderLineHistory.create({
        data: {
          orderLineId: line.id,
          field: "requestedDate",
          oldValue: line.requestedDate.toISOString(),
          newValue: parsed.data.proposedDate!.toISOString(),
          reason: parsed.data.reason,
          changedByType: "supplier",
          validationStatus: "pending",
        },
      }),
    ]);
  } else if (parsed.data.action === "dispute") {
    // Un litige n'est pas une proposition à accepter/rejeter (il n'y a pas
    // d'ancien/nouveau à arbitrer) : contrairement à propose_date, on
    // n'ouvre pas d'entrée d'historique "pending" — l'acheteur est informé
    // (badge "Litige" + motif visible sur la fiche commande, email ci-
    // dessous) mais aucune décision Valider/Rejeter ne lui est demandée.
    await prisma.orderLine.update({
      where: { id: line.id },
      data: { status: "disputed", reason: parsed.data.reason },
    });
  }

  revalidatePath(`/fournisseur/commandes/${line.orderId}`);
  revalidatePath("/acheteur");
  revalidatePath("/acheteur/validations");
  revalidatePath(`/acheteur/commandes/${line.orderId}`);

  if (parsed.data.action === "propose_date") {
    const isFr = line.order.createdBy.locale === "fr";
    await sendBuyerNotification({
      to: line.order.createdBy.email,
      locale: line.order.createdBy.locale,
      subject: isFr
        ? `${line.order.reference} — validation requise (${line.order.supplier.name})`
        : `${line.order.reference} — validation required (${line.order.supplier.name})`,
      bodyHtml: isFr
        ? `<p><strong>${line.order.supplier.name}</strong> a proposé une modification sur la ligne « ${line.designation} » de la commande <strong>${line.order.reference}</strong>. Merci de valider ou rejeter ce changement.</p>`
        : `<p><strong>${line.order.supplier.name}</strong> proposed a change on line "${line.designation}" of order <strong>${line.order.reference}</strong>. Please approve or reject this change.</p>`,
    });
  } else if (parsed.data.action === "dispute") {
    // Simple information, pas une demande de décision : pas de "valider/rejeter" dans le message.
    const isFr = line.order.createdBy.locale === "fr";
    await sendBuyerNotification({
      to: line.order.createdBy.email,
      locale: line.order.createdBy.locale,
      subject: isFr
        ? `${line.order.reference} — litige signalé (${line.order.supplier.name})`
        : `${line.order.reference} — dispute reported (${line.order.supplier.name})`,
      bodyHtml: isFr
        ? `<p><strong>${line.order.supplier.name}</strong> a signalé un litige sur la ligne « ${line.designation} » de la commande <strong>${line.order.reference}</strong> : « ${parsed.data.reason} ».</p>`
        : `<p><strong>${line.order.supplier.name}</strong> reported a dispute on line "${line.designation}" of order <strong>${line.order.reference}</strong>: "${parsed.data.reason}".</p>`,
    });
  }

  return { success: true };
}

export async function uploadDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSupplierSession();

  const parsed = documentUploadSchema.safeParse({
    orderId: formData.get("orderId"),
    type: formData.get("type"),
    expiresAt: formData.get("expiresAt") || undefined,
    replacesId: formData.get("replacesId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Merci de choisir un fichier." };
  }

  let order;
  try {
    order = await assertOwnedOrder(parsed.data.orderId, session.supplierId, session.scopedOrderId);
  } catch {
    return { error: "Accès refusé." };
  }
  if (order.status === "cancelled") {
    return { error: "Cette commande est annulée." };
  }

  let path: string, fileName: string;
  try {
    const uploaded = await uploadDocument({
      orderId: parsed.data.orderId,
      supplierId: session.supplierId,
      file,
    });
    path = uploaded.path;
    fileName = uploaded.fileName;
  } catch (err) {
    console.error("[uploadDocumentAction] échec upload stockage:", err);
    return { error: "Le dépôt du fichier a échoué. Merci de réessayer." };
  }

  const status = computeDocumentStatus(parsed.data.expiresAt ?? null);

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          orderId: parsed.data.orderId,
          supplierId: session.supplierId,
          type: parsed.data.type,
          fileUrl: path,
          fileName,
          status,
          expiresAt: parsed.data.expiresAt ?? null,
          replacesId: parsed.data.replacesId ?? null,
        },
      });

      if (parsed.data.replacesId) {
        await tx.document.update({
          where: { id: parsed.data.replacesId },
          data: { status: "superseded" },
        });
        if (status !== "expired") {
          await tx.orderLine.updateMany({
            where: { orderId: parsed.data.orderId, receptionBlocked: true },
            data: { receptionBlocked: false },
          });
        }
      }

      return doc;
    });
  } catch (err) {
    console.error("[uploadDocumentAction] échec enregistrement:", err);
    return { error: "Le document a été déposé mais son enregistrement a échoué. Merci de réessayer." };
  }

  revalidatePath(`/fournisseur/commandes/${parsed.data.orderId}`);
  revalidatePath(`/acheteur/commandes/${parsed.data.orderId}`);
  revalidatePath("/acheteur");

  return { success: true };
}
