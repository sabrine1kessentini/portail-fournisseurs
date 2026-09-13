import type { OrderLineStatus, DocumentStatus } from "@prisma/client";

/**
 * Small semantic vocabulary shared by every status/trend visual in the app
 * (StatusBadge, TrendIndicator, chart colors). Centralized here so a status
 * always maps to the same tone everywhere, instead of each screen picking
 * its own ad-hoc destructive/secondary ternary.
 */
export type StatusTone = "success" | "warning" | "danger" | "neutral";

export function lineStatusTone(status: OrderLineStatus): StatusTone {
  switch (status) {
    case "confirmed":
      return "success";
    case "partially_confirmed":
    case "date_proposed":
    case "quantity_proposed":
      return "warning";
    case "disputed":
      return "danger";
    case "pending":
    case "cancelled":
    default:
      return "neutral";
  }
}

export function documentStatusTone(status: DocumentStatus): StatusTone {
  switch (status) {
    case "valid":
      return "success";
    case "expiring_soon":
      return "warning";
    case "expiring_urgent":
    case "expired":
      return "danger";
    case "superseded":
    default:
      return "neutral";
  }
}

/** `value` is a signed delta (e.g. onTimeTrend, a percentage-point change). */
export function trendTone(value: number | null): StatusTone {
  if (value === null) return "neutral";
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "neutral";
}

/** `rate` is a 0..1 proportion (e.g. scorecard onTimeRate). */
export function rateTone(rate: number | null): StatusTone {
  if (rate === null) return "neutral";
  if (rate < 0.5) return "danger";
  if (rate < 0.8) return "warning";
  return "success";
}
