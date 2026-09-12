import { prisma } from "@/lib/prisma";
import type { AlertType, Prisma } from "@prisma/client";

const DEDUP_WINDOW_HOURS = 20;

/** Évite de renvoyer la même relance plusieurs fois si le cron tourne plus d'une fois par jour. */
export async function hasRecentDigest(supplierId: string, type: AlertType) {
  const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
  const existing = await prisma.alertDigest.findFirst({
    where: { supplierId, type, sentAt: { gte: since } },
  });
  return !!existing;
}

export async function recordDigest(supplierId: string, type: AlertType, payload: Prisma.InputJsonValue) {
  await prisma.alertDigest.create({
    data: { supplierId, type, payload, sentAt: new Date() },
  });
}
