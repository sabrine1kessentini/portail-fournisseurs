import type { DocumentStatus } from "@prisma/client";
import { documentStatusTone, type StatusTone } from "./status-color";

export interface UrgencyBucket {
  key: DocumentStatus;
  label: string;
  count: number;
  tone: StatusTone;
}

/** Groups already-fetched documents by status, in a fixed display order. */
export function bucketDocumentsByUrgency(
  docs: { status: DocumentStatus }[],
  labels: Record<DocumentStatus, string>
): UrgencyBucket[] {
  const order: DocumentStatus[] = ["expiring_soon", "expiring_urgent", "expired"];
  return order
    .map((key) => ({
      key,
      label: labels[key],
      count: docs.filter((d) => d.status === key).length,
      tone: documentStatusTone(key),
    }))
    .filter((bucket) => bucket.count > 0);
}

/** Sums quantity * unitPrice across already-fetched order lines. No new query — Decimal fields are already present via `include`. */
export function sumOrderValue(lines: { quantity: number; unitPrice: unknown }[]): number {
  return lines.reduce((total, line) => total + line.quantity * Number(line.unitPrice), 0);
}

export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
