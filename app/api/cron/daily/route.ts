import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runUnopenedLinkReminders } from "@/lib/automations/w1-relance";
import { refreshDocumentStatuses } from "@/lib/automations/w3-documents";

/**
 * Point d'entrée unique des automatisations planifiées (W1 relances de lien,
 * W3 suivi documentaire), appelé une fois par jour par Vercel Cron (voir
 * vercel.json). Protégé par CRON_SECRET pour empêcher tout déclenchement
 * public — Vercel Cron envoie ce secret dans l'en-tête Authorization.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${getEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const [w1, w3] = await Promise.all([runUnopenedLinkReminders(), refreshDocumentStatuses()]);
    return NextResponse.json({ ok: true, w1_relance_liens: w1, w3_documents: w3 });
  } catch (err) {
    console.error("[cron/daily] échec :", err);
    return NextResponse.json({ ok: false, error: "Échec de l'exécution du cron." }, { status: 500 });
  }
}
