import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NewOrderForm } from "./new-order-form";

export default async function NewOrderPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{d.buyerDashboard.newOrder}</h1>
      <NewOrderForm
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          defaultCurrency: s.defaultCurrency,
        }))}
        locale={locale}
      />
    </div>
  );
}
