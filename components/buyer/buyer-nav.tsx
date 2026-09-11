"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  GitCompareArrows,
  LineChart,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import type { getDictionary } from "@/lib/i18n/dictionaries";

function useNavItems(dict: ReturnType<typeof getDictionary>) {
  return [
    { href: "/acheteur", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/acheteur/commandes", label: dict.nav.orders, icon: ClipboardList },
    { href: "/acheteur/fournisseurs", label: dict.nav.suppliers, icon: Building2 },
    { href: "/acheteur/validations", label: dict.nav.validations, icon: GitCompareArrows },
    { href: "/acheteur/scorecard", label: dict.nav.scorecard, icon: LineChart },
  ];
}

function NavLinks({
  items,
  onNavigate,
}: {
  items: ReturnType<typeof useNavItems>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BuyerSidebar({
  dict,
  buyerName,
  buyerEmail,
}: {
  dict: ReturnType<typeof getDictionary>;
  buyerName: string;
  buyerEmail: string;
}) {
  const items = useNavItems(dict);
  return (
    <aside className="hidden w-[240px] flex-col border-r bg-muted/20 md:flex">
      <div className="px-5 py-5">
        <span className="text-base font-semibold tracking-tight">{dict.common.appName}</span>
      </div>
      <NavLinks items={items} />
      <div className="border-t px-5 py-4">
        <p className="truncate text-sm font-medium">{buyerName}</p>
        <p className="truncate text-xs text-muted-foreground">{buyerEmail}</p>
      </div>
    </aside>
  );
}

export function BuyerMobileNav({ dict }: { dict: ReturnType<typeof getDictionary> }) {
  const items = useNavItems(dict);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-[260px] p-0">
        <SheetTitle className="px-5 py-5 text-base font-semibold tracking-tight">
          {dict.common.appName}
        </SheetTitle>
        <NavLinks items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
