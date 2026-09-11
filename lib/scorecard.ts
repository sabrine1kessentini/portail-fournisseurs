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

/**
 * Calcule le scorecard d'un fournisseur sur les 90 derniers jours et le
 * compare à la période équivalente précédente pour obtenir une tendance.
 * Simplification documentée (README) : faute de module de réception des
 * marchandises, la ponctualité est dérivée du statut final de la ligne
 * (confirmée telle quelle = à l'heure ; date décalée ou litige = à risque).
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
      select: { status: true },
    }),
    prisma.orderLine.findMany({
      where: {
        order: { supplierId },
        status: { not: "cancelled" },
        createdAt: { gte: previousStart, lt: periodStart },
      },
      select: { status: true },
    }),
  ]);

  const rate = (lines: { status: string }[]) => {
    if (lines.length === 0) return { onTime: null, compliance: null, disputes: 0 };
    const onTimeCount = lines.filter(
      (l) => l.status === "confirmed" || l.status === "partially_confirmed"
    ).length;
    const disputeCount = lines.filter((l) => l.status === "disputed").length;
    const compliantCount = lines.length - disputeCount;
    return {
      onTime: onTimeCount / lines.length,
      compliance: compliantCount / lines.length,
      disputes: disputeCount,
    };
  };

  const current = rate(currentLines);
  const previous = rate(previousLines);

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
