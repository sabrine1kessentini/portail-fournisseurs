import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ count, label }: { count: number; label: string }) {
  return (
    <Link
      href="/acheteur/validations"
      aria-label={label}
      className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9.5px] font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
