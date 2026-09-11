"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/auth/guards";
import { createOrderSchema } from "@/lib/validations";

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

  let orderId: string;
  try {
    const order = await prisma.order.create({
      data: {
        reference: parsed.data.reference,
        supplierId: parsed.data.supplierId,
        currency: parsed.data.currency,
        createdById: buyer.buyerId,
        lines: { create: parsed.data.lines },
      },
    });
    orderId = order.id;
  } catch {
    return { error: "Impossible de créer la commande (référence déjà utilisée ?)." };
  }

  redirect(`/acheteur/commandes/${orderId}`);
}
