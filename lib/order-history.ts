import type { OrderLineHistory } from "@prisma/client";
import type { StatusTone } from "./status-color";

export interface HistoryEntry {
  id: string;
  text: string;
  meta: string;
  tone: StatusTone;
  changedAt: Date;
}

export interface OrderHistoryDict {
  dateLabel: string;
  quantityLabel: string;
  proposed: string;
  approved: string;
  rejected: string;
  by: string;
}

type HistoryWithValidator = OrderLineHistory & { validatedBy: { name: string } | null };
type LineForHistory = { designation: string; history: HistoryWithValidator[] };

function formatDateTime(date: Date, locale: string) {
  return date.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFieldValue(field: string, value: string | null, locale: string): string {
  if (value === null) return "—";
  if (field === "requestedDate") {
    return new Date(value).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US");
  }
  return value;
}

function toneFor(status: OrderLineHistory["validationStatus"]): StatusTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

/** Builds a read-only, chronologically-sorted timeline from already-fetched OrderLineHistory rows. Pure presentation — no query/logic change. */
export function buildOrderHistoryTimeline(
  lines: LineForHistory[],
  supplierName: string,
  dict: OrderHistoryDict,
  locale: string
): HistoryEntry[] {
  const entries = lines.flatMap((line) =>
    line.history.map((h): HistoryEntry => {
      const fieldLabel = h.field === "requestedDate" ? dict.dateLabel : dict.quantityLabel;
      const oldFormatted = formatFieldValue(h.field, h.oldValue, locale);
      const newFormatted = formatFieldValue(h.field, h.newValue, locale);
      const statusWord =
        h.validationStatus === "approved"
          ? dict.approved
          : h.validationStatus === "rejected"
            ? dict.rejected
            : dict.proposed;

      const text = `${line.designation} — ${fieldLabel} ${oldFormatted} → ${newFormatted} (${statusWord})`;

      let meta = `${supplierName} · ${formatDateTime(h.changedAt, locale)}`;
      if (h.validationStatus !== "pending" && h.validatedAt) {
        meta += ` · ${dict.by} ${h.validatedBy?.name ?? "—"} · ${formatDateTime(h.validatedAt, locale)}`;
      }

      return {
        id: h.id,
        text,
        meta,
        tone: toneFor(h.validationStatus),
        changedAt: h.changedAt,
      };
    })
  );

  return entries.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
}
