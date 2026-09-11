import Link from "next/link";
import { requireBuyer } from "@/lib/auth/guards";
import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { logoutBuyerAction } from "@/app/actions/session";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  GitCompareArrows,
  LineChart,
  LogOut,
} from "lucide-react";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const buyer = await requireBuyer();
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  const nav = [
    { href: "/acheteur", label: d.nav.dashboard, icon: LayoutDashboard },
    { href: "/acheteur/commandes", label: d.nav.orders, icon: ClipboardList },
    { href: "/acheteur/fournisseurs", label: d.nav.suppliers, icon: Building2 },
    { href: "/acheteur/validations", label: d.nav.validations, icon: GitCompareArrows },
    { href: "/acheteur/scorecard", label: d.nav.scorecard, icon: LineChart },
  ];

  return (
    <div className="grid min-h-svh grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r bg-muted/20">
        <div className="px-5 py-5">
          <span className="text-base font-semibold tracking-tight">{d.common.appName}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t px-5 py-4">
          <p className="truncate text-sm font-medium">{buyer.name}</p>
          <p className="truncate text-xs text-muted-foreground">{buyer.email}</p>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-end gap-2 border-b px-6 py-3">
          <LocaleSwitcher current={locale} />
          <form action={logoutBuyerAction}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-1 size-4" />
              {d.nav.logout}
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
