import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ChangeDiffCard } from "@/components/buyer/change-diff-card";

export default async function ValidationsPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const pending = await prisma.orderLineHistory.findMany({
    where: { validationStatus: "pending" },
    include: { orderLine: { include: { order: { include: { supplier: true } } } } },
    orderBy: { changedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-normal tracking-tight">{d.nav.validations}</h1>

      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {locale === "fr" ? "Rien à valider pour le moment." : "Nothing to validate right now."}
        </p>
      )}

      <div className="space-y-3">
        {pending.map((history) => (
          <ChangeDiffCard
            key={history.id}
            line={history.orderLine}
            history={history}
            dict={d}
            locale={locale}
            showOrderContext={{
              reference: history.orderLine.order.reference,
              supplierName: history.orderLine.order.supplier.name,
              href: `/acheteur/commandes/${history.orderLine.orderId}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
