import type { OrderLineStatus } from "@prisma/client";

export interface LineProgress {
  total: number;
  confirmed: number;
  pending: number;
  disputed: number;
}

/** Pure summary over already-fetched line statuses — no new query. */
export function summarizeLineProgress(lines: { status: OrderLineStatus }[]): LineProgress {
  return {
    total: lines.length,
    confirmed: lines.filter((l) => l.status === "confirmed" || l.status === "partially_confirmed").length,
    pending: lines.filter((l) => l.status === "pending").length,
    disputed: lines.filter((l) => l.status === "disputed").length,
  };
}
