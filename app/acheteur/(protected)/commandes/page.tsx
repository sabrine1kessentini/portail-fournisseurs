import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function OrdersPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  const orders = await prisma.order.findMany({
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-normal tracking-tight">{d.nav.orders}</h1>
        <Button nativeButton={false} render={<Link href="/acheteur/commandes/nouvelle" />}>
          <Plus className="mr-1.5 size-4" />
          {d.buyerDashboard.newOrder}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">{isFr ? "Référence" : "Reference"}</th>
              <th className="px-4 py-2.5 font-medium">{d.nav.suppliers}</th>
              <th className="px-4 py-2.5 font-medium">{isFr ? "Lignes" : "Lines"}</th>
              <th className="px-4 py-2.5 font-medium">{isFr ? "Devise" : "Currency"}</th>
              <th className="px-4 py-2.5 font-medium">{isFr ? "Statut" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2.5">
                  <Link href={`/acheteur/commandes/${o.id}`} className="font-medium hover:underline">
                    {o.reference}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{o.supplier.name}</td>
                <td className="px-4 py-2.5">{o.lines.length}</td>
                <td className="px-4 py-2.5">{o.currency}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={o.status === "cancelled" ? "destructive" : "outline"}>
                    {d.orderStatus[o.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {isFr ? "Aucune commande pour le moment." : "No orders yet."}
          </p>
        )}
      </div>
    </div>
  );
}
