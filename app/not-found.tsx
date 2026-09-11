import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <FileQuestion className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h1 className="mb-2 text-lg font-semibold">Page introuvable</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Cette page n&apos;existe pas ou plus.
          </p>
          <Button nativeButton={false} render={<Link href="/" />}>
            Retour à l&apos;accueil
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
