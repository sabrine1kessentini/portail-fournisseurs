import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateLinkButton } from "@/components/buyer/generate-link-button";
import { RevokeLinkButton } from "@/components/buyer/revoke-link-button";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      magicLinks: {
        where: { orderId: null },
        orderBy: { createdAt: "desc" },
        include: { accesses: true },
      },
    },
  });

  if (!supplier) notFound();

  const distinctIps = (ips: (string | null)[]) => new Set(ips.filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
        <p className="text-sm text-muted-foreground">
          {supplier.email} · {supplier.defaultCurrency}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{d.nav.orders}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {supplier.orders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isFr ? "Aucune commande." : "No orders."}
              </p>
            )}
            {supplier.orders.map((o) => (
              <Link
                key={o.id}
                href={`/acheteur/commandes/${o.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="font-medium">{o.reference}</span>
                <Badge variant="outline">{d.orderStatus[o.status]}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">
              {isFr ? "Lien fournisseur (accès global)" : "Supplier link (global access)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplier.magicLinks
              .filter((l) => !l.revoked && l.expiresAt > new Date())
              .map((link) => (
                <div key={link.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {isFr ? "Expire le" : "Expires"}{" "}
                      {link.expiresAt.toLocaleDateString(locale)}
                    </span>
                    <RevokeLinkButton
                      magicLinkId={link.id}
                      redirectPath={`/acheteur/fournisseurs/${supplier.id}`}
                      label={d.buyerDashboard.revokeLink}
                    />
                  </div>
                  {link.accesses.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.buyerDashboard.accessCount
                        .replace("{count}", String(link.accesses.length))
                        .replace("{ips}", String(distinctIps(link.accesses.map((a) => a.ip))))}
                    </p>
                  )}
                </div>
              ))}
            <GenerateLinkButton
              supplierId={supplier.id}
              label={d.buyerDashboard.generateLink}
              copiedLabel={d.buyerDashboard.linkCopied}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
