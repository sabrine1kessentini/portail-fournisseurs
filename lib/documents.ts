import type { DocumentStatus } from "@prisma/client";

const SOON_THRESHOLD_DAYS = 15;
const URGENT_THRESHOLD_DAYS = 5;

/** Statut dérivé de la date d'expiration — utilisé à l'upload puis recalculé par le cron W3. */
export function computeDocumentStatus(expiresAt: Date | null, now = new Date()): DocumentStatus {
  if (!expiresAt) return "valid";
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= URGENT_THRESHOLD_DAYS) return "expiring_urgent";
  if (daysLeft <= SOON_THRESHOLD_DAYS) return "expiring_soon";
  return "valid";
}
