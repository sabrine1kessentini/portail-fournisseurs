import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSupplierSession } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SupplierOrdersPage() {
  const session = await requireSupplierSession();
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  if (session.scopedOrderId) {
    redirect(`/fournisseur/commandes/${session.scopedOrderId}`);
  }

  const orders = await prisma.order.findMany({
    where: { supplierId: session.supplierId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{d.supplierPortal.yourOrders}</h1>

      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isFr ? "Aucune commande pour le moment." : "No orders yet."}
        </p>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const pendingCount = order.lines.filter((l) => l.status === "pending").length;
          return (
            <Link key={order.id} href={`/fournisseur/commandes/${order.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{order.reference}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.lines.length} {isFr ? "ligne(s)" : "line(s)"} · {order.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                      <Badge>{pendingCount} {isFr ? "en attente" : "pending"}</Badge>
                    )}
                    <Badge variant={order.status === "cancelled" ? "destructive" : "outline"}>
                      {d.orderStatus[order.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
