"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/auth/guards";
import { createSupplierSchema } from "@/lib/validations";
import { createMagicLink, buildMagicLinkUrl, revokeMagicLink } from "@/lib/auth/supplier";
import { sendSupplierInvitation } from "@/lib/email";

export interface FormState {
  error?: string;
}

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireBuyer();

  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    defaultCurrency: formData.get("defaultCurrency"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await prisma.supplier.create({ data: parsed.data });
  } catch {
    return { error: "Un fournisseur avec cet email existe déjà." };
  }

  revalidatePath("/acheteur/fournisseurs");
  redirect("/acheteur/fournisseurs");
}

/** Génère un lien fournisseur (portée globale ou restreinte à une commande) et l'envoie par email. */
export async function generateAndSendLinkAction(params: {
  supplierId: string;
  orderId?: string | null;
}) {
  const buyer = await requireBuyer();
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: params.supplierId } });

  const order = params.orderId
    ? await prisma.order.findUnique({ where: { id: params.orderId } })
    : null;

  const { token } = await createMagicLink({
    supplierId: params.supplierId,
    orderId: params.orderId ?? null,
    createdById: buyer.buyerId,
  });

  const magicLinkUrl = buildMagicLinkUrl(token);

  await sendSupplierInvitation({
    to: supplier.email,
    locale: supplier.locale,
    orderReference: order?.reference ?? "—",
    magicLinkUrl,
  });

  if (params.orderId) revalidatePath(`/acheteur/commandes/${params.orderId}`);
  revalidatePath("/acheteur/fournisseurs");
  revalidatePath(`/acheteur/fournisseurs/${params.supplierId}`);

  return { magicLinkUrl };
}

export async function revokeLinkAction(magicLinkId: string, redirectPath: string) {
  await requireBuyer();
  await revokeMagicLink(magicLinkId);
  revalidatePath(redirectPath);
}
