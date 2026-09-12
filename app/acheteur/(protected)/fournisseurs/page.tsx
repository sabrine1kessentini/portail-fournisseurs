import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewSupplierForm } from "./new-supplier-form";

export default async function SuppliersPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{d.nav.suppliers}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {suppliers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isFr ? "Aucun fournisseur pour le moment." : "No suppliers yet."}
            </p>
          )}
          {suppliers.map((s) => (
            <Link
              key={s.id}
              href={`/acheteur/fournisseurs/${s.id}`}
              className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {s._count.orders} {isFr ? "commande(s)" : "order(s)"}
                </Badge>
              </div>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isFr ? "Nouveau fournisseur" : "New supplier"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NewSupplierForm isFr={isFr} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
