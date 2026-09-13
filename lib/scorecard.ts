import { prisma } from "@/lib/prisma";

export interface SupplierScorecard {
  supplierId: string;
  supplierName: string;
  totalLines: number;
  onTimeRate: number | null; // 0..1, null si aucune ligne évaluable
  complianceRate: number | null;
  disputes: number;
  onTimeTrend: number | null; // delta vs période précédente, en points de %
}

const PERIOD_DAYS = 90;

type ScorableLine = { status: string; requestedDate: Date; receivedAt: Date | null };
type Verdict = "onTime" | "late" | "dispute" | "notYetDue";

/**
 * Détermine si une ligne peut être jugée à date : un litige tranche
 * immédiatement (à risque, peu importe les dates) ; une ligne réceptionnée
 * se juge en comparant receivedAt à requestedDate (qui reflète la date
 * finale convenue : elle est mise à jour en place si un changement de date
 * a été validé, voir validateDiffAction) ; une ligne jamais réceptionnée
 * dont la date est dépassée est considérée en retard ; une ligne pas encore
 * due (requestedDate future, pas encore réceptionnée) n'est pas encore
 * jugeable — elle est exclue plutôt que comptée par défaut contre le score.
 */
function evaluate(line: ScorableLine, now: Date): Verdict {
  if (line.status === "disputed") return "dispute";
  if (line.receivedAt) return line.receivedAt <= line.requestedDate ? "onTime" : "late";
  if (line.requestedDate < now) return "late";
  return "notYetDue";
}

function rate(lines: ScorableLine[], now: Date) {
  const verdicts = lines.map((l) => evaluate(l, now)).filter((v): v is Exclude<Verdict, "notYetDue"> => v !== "notYetDue");
  if (verdicts.length === 0) return { onTime: null, compliance: null, disputes: 0 };
  const onTimeCount = verdicts.filter((v) => v === "onTime").length;
  const disputeCount = verdicts.filter((v) => v === "dispute").length;
  return {
    onTime: onTimeCount / verdicts.length,
    compliance: (verdicts.length - disputeCount) / verdicts.length,
    disputes: disputeCount,
  };
}

/**
 * Calcule le scorecard d'un fournisseur sur les 90 derniers jours et le
 * compare à la période équivalente précédente pour obtenir une tendance.
 * La ponctualité et la conformité se basent sur les dates réelles
 * (requestedDate/receivedAt) plutôt que sur le seul statut final — voir
 * evaluate() ci-dessus.
 */
export async function getSupplierScorecard(supplierId: string): Promise<SupplierScorecard> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const previousStart = new Date(periodStart.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  const [currentLines, previousLines] = await Promise.all([
    prisma.orderLine.findMany({
      where: {
        order: { supplierId },
        status: { not: "cancelled" },
        createdAt: { gte: periodStart },
      },
      select: { status: true, requestedDate: true, receivedAt: true },
    }),
    prisma.orderLine.findMany({
      where: {
        order: { supplierId },
        status: { not: "cancelled" },
        createdAt: { gte: previousStart, lt: periodStart },
      },
      select: { status: true, requestedDate: true, receivedAt: true },
    }),
  ]);

  const current = rate(currentLines, now);
  const previous = rate(previousLines, now);

  return {
    supplierId,
    supplierName: supplier.name,
    totalLines: currentLines.length,
    onTimeRate: current.onTime,
    complianceRate: current.compliance,
    disputes: current.disputes,
    onTimeTrend:
      current.onTime !== null && previous.onTime !== null
        ? current.onTime - previous.onTime
        : null,
  };
}

export async function getAllSuppliersScorecards(): Promise<SupplierScorecard[]> {
  const suppliers = await prisma.supplier.findMany({ select: { id: true } });
  return Promise.all(suppliers.map((s) => getSupplierScorecard(s.id)));
}
