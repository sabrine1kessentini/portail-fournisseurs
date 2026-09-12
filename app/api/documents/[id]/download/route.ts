import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBuyerSession } from "@/lib/auth/buyer";
import { getSupplierSession } from "@/lib/auth/supplier";
import { getSignedDocumentUrl } from "@/lib/storage";

/**
 * Point d'accès unique aux documents, utilisé par l'espace acheteur (accès
 * total) et le portail fournisseur (scoping strict : uniquement ses propres
 * documents, et restreint à la commande si le lien est spécifique à une
 * commande). Ne renvoie jamais l'URL de stockage brute : génère une URL
 * signée à durée limitée à chaque appel.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const buyer = await getBuyerSession();
  if (buyer) {
    const url = await getSignedDocumentUrl(document.fileUrl, document.fileName);
    return NextResponse.redirect(url);
  }

  const supplier = await getSupplierSession();
  if (
    supplier &&
    supplier.supplierId === document.supplierId &&
    (!supplier.scopedOrderId || supplier.scopedOrderId === document.orderId)
  ) {
    const url = await getSignedDocumentUrl(document.fileUrl, document.fileName);
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
}
