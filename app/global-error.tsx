"use client";

import { useEffect } from "react";

/**
 * Filet de sécurité si l'erreur survient dans le RootLayout lui-même (donc
 * avant que app/error.tsx puisse s'appliquer). Doit fournir son propre
 * <html>/<body> puisqu'il remplace tout l'arbre.
 */
export default function GlobalError({
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
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8 }}>
              Une erreur critique est survenue
            </h1>
            <p style={{ color: "#666", marginBottom: 24, fontSize: "0.875rem" }}>
              L&apos;application n&apos;a pas pu se charger correctement.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                background: "#111",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
