import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { generateToken, hashToken } from "./crypto";
import { SUPPLIER_COOKIE_NAME } from "./cookie-names";

export { SUPPLIER_COOKIE_NAME };
const MAGIC_LINK_TTL_DAYS = 21;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createMagicLink(params: {
  supplierId: string;
  orderId?: string | null;
  createdById: string;
  ttlDays?: number;
}) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + (params.ttlDays ?? MAGIC_LINK_TTL_DAYS) * 24 * 60 * 60 * 1000
  );
  const link = await prisma.magicLink.create({
    data: {
      tokenHash,
      supplierId: params.supplierId,
      orderId: params.orderId ?? null,
      expiresAt,
      createdById: params.createdById,
    },
  });
  return { link, token };
}

export function buildMagicLinkUrl(token: string) {
  return `${getEnv().APP_URL}/f/${token}`;
}

export async function revokeMagicLink(magicLinkId: string, reason: "manual" | "forwarded" = "manual") {
  await prisma.magicLink.update({
    where: { id: magicLinkId },
    data: { revoked: true, revokedReason: reason },
  });
}

/**
 * Résout un token de lien magique : vérifie validité, journalise l'accès
 * (traçabilité en cas de lien transféré) et ouvre une session fournisseur.
 * Retourne null si le lien est invalide, expiré ou révoqué.
 *
 * Cas limite "lien transféré" : la détection ne se base PAS sur l'IP (deux
 * appareils sur le même réseau/WiFi partagent la même IP publique via le NAT
 * du routeur — un transfert au sein d'un même bureau serait invisible). Elle
 * se base sur le **cookie de session** : le premier navigateur à ouvrir le
 * lien reçoit un cookie et peut continuer à l'utiliser librement (y compris
 * en revisitant l'URL du lien). Si un DEUXIÈME contexte navigateur (autre
 * appareil, autre navigateur, navigation privée) sans ce cookie tente
 * d'ouvrir le même lien — même depuis la même IP — c'est traité comme un
 * transfert et le lien est bloqué pour tout le monde.
 */
export async function resolveMagicLinkAndCreateSession(token: string) {
  const tokenHash = hashToken(token);
  const link = await prisma.magicLink.findUnique({ where: { tokenHash } });
  if (!link) return null;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent");

  await prisma.orderAccessLog.create({
    data: { magicLinkId: link.id, ip, userAgent },
  });

  if (link.revoked || link.expiresAt < new Date()) {
    return { status: "invalid" as const, reason: "invalid" as const };
  }

  if (link.openedAt) {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(SUPPLIER_COOKIE_NAME)?.value;
    const existingSession = existingToken
      ? await prisma.supplierSession.findFirst({
          where: {
            tokenHash: hashToken(existingToken),
            magicLinkId: link.id,
            expiresAt: { gt: new Date() },
          },
        })
      : null;

    if (!existingSession) {
      await revokeMagicLink(link.id, "forwarded");
      return { status: "invalid" as const, reason: "forwarded" as const };
    }
    // Même contexte navigateur déjà authentifié pour ce lien : simple revisite, pas un transfert.
  } else {
    await prisma.magicLink.update({
      where: { id: link.id },
      data: { openedAt: new Date() },
    });
  }

  const sessionToken = generateToken();
  const sessionTokenHash = hashToken(sessionToken);
  await prisma.supplierSession.create({
    data: {
      tokenHash: sessionTokenHash,
      supplierId: link.supplierId,
      magicLinkId: link.id,
      expiresAt: link.expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SUPPLIER_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { status: "ok" as const, supplierId: link.supplierId, orderId: link.orderId };
}

export async function destroySupplierSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPPLIER_COOKIE_NAME)?.value;
  if (token) {
    await prisma.supplierSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SUPPLIER_COOKIE_NAME);
}

export interface SupplierSessionInfo {
  supplierId: string;
  supplierName: string;
  supplierLocale: "fr" | "en";
  scopedOrderId: string | null;
}

/** Retourne la session fournisseur active, ou null si absente/expirée/révoquée. */
export async function getSupplierSession(): Promise<SupplierSessionInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPPLIER_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.supplierSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { supplier: true, magicLink: true },
  });

  if (!session || session.expiresAt < new Date() || session.magicLink.revoked) {
    return null;
  }

  return {
    supplierId: session.supplierId,
    supplierName: session.supplier.name,
    supplierLocale: session.supplier.locale,
    scopedOrderId: session.magicLink.orderId,
  };
}
