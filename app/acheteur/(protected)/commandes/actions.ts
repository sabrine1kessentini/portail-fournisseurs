"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/auth/guards";
import { createOrderSchema } from "@/lib/validations";
import { createMagicLink, buildMagicLinkUrl } from "@/lib/auth/supplier";
import { sendSupplierInvitation } from "@/lib/email";

export interface FormState {
  error?: string;
}

export async function createOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const buyer = await requireBuyer();

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "Lignes de commande invalides." };
  }

  const parsed = createOrderSchema.safeParse({
    reference: formData.get("reference"),
    supplierId: formData.get("supplierId"),
    currency: formData.get("currency"),
    lines: linesRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  let order;
  try {
    order = await prisma.order.create({
      data: {
        reference: parsed.data.reference,
        supplierId: parsed.data.supplierId,
        currency: parsed.data.currency,
        createdById: buyer.buyerId,
        lines: { create: parsed.data.lines },
      },
      include: { supplier: true },
    });
  } catch {
    return { error: "Impossible de créer la commande (référence déjà utilisée ?)." };
  }

  // W1 "Commande émise" : le lien fournisseur et l'email d'invitation
  // s'enchaînent automatiquement après la création, sans action
  // supplémentaire de l'acheteur. La commande existe déjà à ce stade : un
  // échec ici (réseau, quota email...) ne doit jamais être présenté comme un
  // échec de création — l'acheteur pourra toujours renvoyer un lien
  // manuellement depuis la page de la commande.
  // Lien à accès global (orderId: null) plutôt que scopé à cette seule
  // commande : un fournisseur récurrent doit pouvoir consulter l'ensemble de
  // ses commandes depuis le même lien, pas recevoir un lien à usage unique
  // par commande. Un lien scopé à une commande précise reste disponible à
  // la demande depuis la fiche commande ("Lien fournisseur (cette commande)").
  try {
    const { token } = await createMagicLink({
      supplierId: order.supplierId,
      orderId: null,
      createdById: buyer.buyerId,
    });
    await sendSupplierInvitation({
      to: order.supplier.email,
      locale: order.supplier.locale,
      orderReference: order.reference,
      magicLinkUrl: buildMagicLinkUrl(token),
    });
  } catch (err) {
    console.error("[createOrderAction] échec de l'invitation automatique :", err);
  }

  redirect(`/acheteur/commandes/${order.id}`);
}
