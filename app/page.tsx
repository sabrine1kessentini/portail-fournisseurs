import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClipboardList, Link2, FileCheck2, LineChart, ArrowRight, AlertTriangle, FileWarning } from "lucide-react";
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

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {isFr ? "Centre de pilotage achats" : "Procurement command center"}
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {isFr
              ? "Remplacez les échanges email par un portail fournisseurs unique"
              : "Replace scattered email threads with a single supplier portal"}
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            {isFr
              ? "Le fournisseur confirme les lignes et les dates, dépose ses documents, signale un écart. L'acheteur voit immédiatement le risque sur ses commandes."
              : "Suppliers confirm lines and dates, upload documents, and flag issues. Buyers immediately see the risk on their orders."}
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Button size="lg" nativeButton={false} render={<Link href="/acheteur/connexion" />}>
              {isFr ? "Accéder au tableau de bord" : "Go to dashboard"}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {isFr
              ? "Fournisseur ? Vous recevez un lien personnel par email — pas de mot de passe à créer."
              : "Supplier? You receive a personal link by email — no password to create."}
          </p>
        </div>

        <ProductPreview isFr={isFr} />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card key={f.title} className="text-left">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <f.icon className="size-6 text-primary" strokeWidth={1.75} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
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

/**
 * Static illustrative preview of the buyer dashboard for the hero section —
 * no data fetching (public, unauthenticated page): representative content
 * only, reusing the same StatusBadge/Card visual language as the real app.
 */
function ProductPreview({ isFr }: { isFr: boolean }) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-3 gap-3">
          <PreviewKpi icon={AlertTriangle} value={3} label={isFr ? "À risque" : "At risk"} tone="danger" />
          <PreviewKpi icon={FileWarning} value={5} label={isFr ? "Documents" : "Documents"} tone="warning" />
          <PreviewKpi icon={LineChart} value={92} suffix="%" label={isFr ? "Ponctualité" : "On-time"} tone="success" />
        </div>
        <div className="space-y-2">
          <PreviewRow reference="PO-2026-014" supplier="Atlas Composants" label={isFr ? "Litige" : "Dispute"} tone="danger" />
          <PreviewRow
            reference="PO-2026-021"
            supplier="Nordic Parts AB"
            label={isFr ? "Date proposée" : "Date proposed"}
            tone="warning"
          />
          <PreviewRow reference="PO-2026-018" supplier="Pacific Trading Co" label={isFr ? "Confirmée" : "Confirmed"} tone="success" />
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewKpi({
  icon: Icon,
  value,
  suffix,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix?: string;
  label: string;
  tone: "success" | "warning" | "danger";
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className="rounded-lg border p-3">
      <div className={`mb-2 flex size-8 items-center justify-center rounded-full ${toneClasses[tone]}`}>
        <Icon className="size-4" />
      </div>
      <p className="font-mono text-xl font-semibold tabular-nums">
        {value}
        {suffix}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PreviewRow({
  reference,
  supplier,
  label,
  tone,
}: {
  reference: string;
  supplier: string;
  label: string;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{reference}</p>
        <p className="text-xs text-muted-foreground">{supplier}</p>
      </div>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </div>
  );
}
