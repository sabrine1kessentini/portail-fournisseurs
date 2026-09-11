"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="mx-auto mb-4 size-10 text-destructive" />
          <h1 className="mb-2 text-lg font-semibold">Une erreur est survenue</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer ou revenir à
            l&apos;accueil.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Accueil
            </Button>
            <Button onClick={() => reset()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
