import { resolveLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function LinkExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const locale = await resolveLocale();
  const d = getDictionary(locale);
  const { reason } = await searchParams;
  const forwarded = reason === "forwarded";

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <h1 className="mb-2 text-lg font-semibold">
            {forwarded ? d.supplierPortal.linkBlockedForwardedTitle : d.supplierPortal.linkExpiredTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {forwarded ? d.supplierPortal.linkBlockedForwardedBody : d.supplierPortal.linkExpiredBody}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
