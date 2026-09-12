import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiffDecisionForm } from "@/components/buyer/diff-decision-form";
import { ImpactBadge } from "@/components/buyer/impact-badge";
import type { getDictionary, AppLocale } from "@/lib/i18n/dictionaries";

interface DiffHistory {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
}

function formatValue(field: string, value: string | null, locale: string) {
  if (!value) return "—";
  if (field !== "requestedDate") return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
}

/**
 * Shared old→new change visual, used by the order-detail "pending diffs"
 * section, the /acheteur/validations queue, and the dashboard's critical
 * actions list — previously duplicated inline in each of those three
 * places. Wraps the existing DiffDecisionForm/ImpactBadge unchanged; only
 * the surrounding layout is new.
 */
export function ChangeDiffCard({
  line,
  history,
  dict,
  locale,
  showOrderContext,
}: {
  line: { designation: string };
  history: DiffHistory;
  dict: ReturnType<typeof getDictionary>;
  locale: AppLocale;
  showOrderContext?: { reference: string; supplierName: string; href: string };
}) {
  const body = (
    <div className="space-y-3">
      <p className="text-sm font-medium">{line.designation}</p>

      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="min-w-0">
          <p className="text-xs uppercase text-muted-foreground">{dict.buyerDashboard.diffOld}</p>
          <p className="truncate font-mono text-sm text-muted-foreground line-through">
            {formatValue(history.field, history.oldValue, locale)}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs uppercase text-muted-foreground">{dict.buyerDashboard.diffNew}</p>
          <p className="truncate font-mono text-sm font-semibold">
            {formatValue(history.field, history.newValue, locale)}
          </p>
        </div>
        {history.field === "requestedDate" && history.oldValue && history.newValue && (
          <ImpactBadge oldIso={history.oldValue} newIso={history.newValue} dict={dict} />
        )}
        <div className="ml-auto w-full shrink-0 sm:w-auto">
          <DiffDecisionForm historyId={history.id} dict={dict} />
        </div>
      </div>

      {history.reason && (
        <p className="text-sm text-muted-foreground">
          {dict.supplierPortal.reason} : {history.reason}
        </p>
      )}
    </div>
  );

  // Nested inline (order-detail page, already inside a parent Card): plain
  // bordered block. Standalone (dashboard, /acheteur/validations): full Card
  // with its own order/supplier header.
  if (!showOrderContext) {
    return <div className="rounded-md border p-4">{body}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link href={showOrderContext.href} className="hover:underline">
            {showOrderContext.reference}
          </Link>{" "}
          <span className="font-normal text-muted-foreground">· {showOrderContext.supplierName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
