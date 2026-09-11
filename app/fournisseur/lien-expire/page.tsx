import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function LinkExpiredPage() {
  const locale = await resolveLocale();
  const d = getDictionary(locale);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="mx-auto mb-4 size-10 text-destructive" />
          <h1 className="mb-2 text-lg font-semibold">{d.supplierPortal.linkExpiredTitle}</h1>
          <p className="text-sm text-muted-foreground">{d.supplierPortal.linkExpiredBody}</p>
        </CardContent>
      </Card>
    </main>
  );
}
