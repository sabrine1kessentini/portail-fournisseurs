import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { initials } from "@/lib/initials";
import { orderStatusTone } from "@/lib/status-color";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-normal tracking-tight">{d.nav.orders}</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} {isFr ? "commande(s)" : "order(s)"}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/acheteur/commandes/nouvelle" />}>
          <Plus className="mr-1.5 size-4" />
          {d.buyerDashboard.newOrder}
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Commande" : "Order"}</th>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Lignes" : "Lines"}</th>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Devise" : "Currency"}</th>
                <th className="px-4 py-2.5 font-medium">{isFr ? "Statut" : "Status"}</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="group/row border-t">
                  <td className="p-0">
                    <Link
                      href={`/acheteur/commandes/${o.id}`}
                      className="flex items-center gap-3 px-4 py-3 group-hover/row:bg-accent/50"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-medium">
                        {initials(o.supplier.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{o.reference}</p>
                        <p className="truncate text-xs text-muted-foreground">{o.supplier.name}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {o.lines.length}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.currency}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={orderStatusTone(o.status)}>{d.orderStatus[o.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    <ChevronRight className="ml-auto size-4" />
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
        </CardContent>
      </Card>
    </div>
  );
}
