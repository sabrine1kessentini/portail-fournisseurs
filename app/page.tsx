import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList, Link2, FileCheck2, LineChart, ArrowRight } from "lucide-react";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Home() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const isFr = locale === "fr";

  const features = [
    {
      icon: ClipboardList,
      title: isFr ? "Commandes" : "Orders",
      desc: isFr
        ? "Lignes, quantités, prix, dates, confirmations partielles et historique des modifications."
        : "Lines, quantities, prices, dates, partial confirmations and change history.",
    },
    {
      icon: Link2,
      title: isFr ? "Portail externe" : "External portal",
      desc: isFr
        ? "Lien sécurisé expirable, actions limitées et interface bilingue FR/EN."
        : "Expirable secure link, limited actions and bilingual FR/EN interface.",
    },
    {
      icon: FileCheck2,
      title: isFr ? "Documents" : "Documents",
      desc: isFr
        ? "Facture pro forma, certificat, packing list avec statut et expiration."
        : "Proforma invoice, certificate, packing list with status and expiry.",
    },
    {
      icon: LineChart,
      title: isFr ? "Scorecard" : "Scorecard",
      desc: isFr
        ? "Ponctualité, taux de conformité, litiges et tendance par période."
        : "On-time rate, compliance rate, disputes and trend over time.",
    },
  ];

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">{d.common.appName}</span>
          <Button nativeButton={false} render={<Link href="/acheteur/connexion" />}>
            {isFr ? "Espace acheteur" : "Buyer space"}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {isFr
            ? "Remplacez les échanges email par un portail fournisseurs unique"
            : "Replace scattered email threads with a single supplier portal"}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          {isFr
            ? "Le fournisseur confirme les lignes et les dates, dépose ses documents, signale un écart. L'acheteur voit immédiatement le risque sur ses commandes."
            : "Suppliers confirm lines and dates, upload documents, and flag issues. Buyers immediately see the risk on their orders."}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" nativeButton={false} render={<Link href="/acheteur/connexion" />}>
            {isFr ? "Accéder au tableau de bord" : "Go to dashboard"}
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {isFr
            ? "Fournisseur ? Vous recevez un lien personnel par email — pas de mot de passe à créer."
            : "Supplier? You receive a personal link by email — no password to create."}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="text-left">
              <CardHeader>
                <f.icon className="size-6 text-primary" strokeWidth={1.75} />
                <CardTitle className="mt-3">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <p className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          {d.common.appName} — {isFr ? "Terrain métier : Achats" : "Business area: Procurement"}
        </p>
      </footer>
    </main>
  );
}
