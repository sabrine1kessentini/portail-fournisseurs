"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/auth/guards";
import { validationDecisionSchema } from "@/lib/validations";

/**
 * Applique ou rejette une proposition de modification fournisseur (W2).
 * Approuvé : la nouvelle valeur devient la référence et la ligne repasse
 * "confirmée". Rejeté : la ligne repasse "en attente", le fournisseur doit
 * proposer une nouvelle date ou confirmer telle quelle.
 */
export async function validateDiffAction(formData: FormData) {
  const buyer = await requireBuyer();

  const parsed = validationDecisionSchema.safeParse({
    historyId: formData.get("historyId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return;

  try {
    const history = await prisma.orderLineHistory.findUnique({
      where: { id: parsed.data.historyId },
      include: { orderLine: true },
    });
    if (!history || history.validationStatus !== "pending") return;

    await prisma.orderLineHistory.update({
      where: { id: history.id },
      data: {
        validationStatus: parsed.data.decision,
        validatedById: buyer.buyerId,
        validatedAt: new Date(),
      },
    });

    if (history.field === "requestedDate") {
      if (parsed.data.decision === "approved" && history.orderLine.proposedDate) {
        await prisma.orderLine.update({
          where: { id: history.orderLine.id },
          data: {
            requestedDate: history.orderLine.proposedDate,
            proposedDate: null,
            confirmedQuantity: history.orderLine.quantity,
            status: "confirmed",
          },
        });
      } else {
        await prisma.orderLine.update({
          where: { id: history.orderLine.id },
          data: { proposedDate: null, reason: null, status: "pending" },
        });
      }
    } else if (history.field === "confirmedQuantity") {
      if (parsed.data.decision === "approved") {
        await prisma.orderLine.update({
          where: { id: history.orderLine.id },
          data: {
            confirmedQuantity: Number(history.newValue),
            status: "partially_confirmed",
          },
        });
      } else {
        await prisma.orderLine.update({
          where: { id: history.orderLine.id },
          data: { confirmedQuantity: null, status: "pending" },
        });
      }
    } else if (history.field === "status" && history.newValue === "disputed") {
      await prisma.orderLine.update({
        where: { id: history.orderLine.id },
        data: { status: parsed.data.decision === "approved" ? "disputed" : "pending" },
      });
    }

    revalidatePath(`/acheteur/commandes/${history.orderLine.orderId}`);
    revalidatePath("/acheteur");
    revalidatePath("/acheteur/validations");
  } catch (err) {
    // Une erreur transitoire (latence base, connexion) ne doit jamais faire
    // planter la page vers l'écran d'erreur générique : on logue et on
    // laisse l'acheteur réessayer simplement en recliquant.
    console.error("[validateDiffAction] échec :", err);
  }
}

export async function cancelOrderAction(orderId: string) {
  await requireBuyer();
  try {
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: "cancelled" } }),
      prisma.orderLine.updateMany({ where: { orderId }, data: { status: "cancelled" } }),
    ]);
    revalidatePath(`/acheteur/commandes/${orderId}`);
    revalidatePath("/acheteur/commandes");
  } catch (err) {
    console.error("[cancelOrderAction] échec :", err);
  }
}

export async function markReceivedAction(lineId: string, orderId: string) {
  await requireBuyer();
  try {
    await prisma.orderLine.update({ where: { id: lineId }, data: { receivedAt: new Date() } });
    revalidatePath(`/acheteur/commandes/${orderId}`);
  } catch (err) {
    console.error("[markReceivedAction] échec :", err);
  }
}
