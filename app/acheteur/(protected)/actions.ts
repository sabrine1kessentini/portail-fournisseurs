"use server";

import { revalidatePath } from "next/cache";
import { requireBuyer } from "@/lib/auth/guards";
import { runUnopenedLinkReminders } from "@/lib/automations/w1-relance";
import { refreshDocumentStatuses } from "@/lib/automations/w3-documents";

/**
 * Déclenche manuellement, depuis l'UI acheteur, exactement la même logique
 * que le cron quotidien (app/api/cron/daily/route.ts) — utile pour tester ou
 * démontrer les relances sans attendre l'exécution planifiée (06h00,
 * vercel.json). Protégé par requireBuyer() plutôt que CRON_SECRET puisque
 * c'est un acheteur authentifié qui l'invoque, pas Vercel Cron.
 */
export async function runAutomationsNowAction() {
  await requireBuyer();

  try {
    const [w1, w3] = await Promise.all([runUnopenedLinkReminders(), refreshDocumentStatuses()]);
    revalidatePath("/acheteur");
    return {
      ok: true as const,
      relancesLiens: w1.remindersSent,
      relancesDocuments: w3.remindersSent,
      escalades: w3.escalationsSent,
      lignesBloquees: w3.expiredNewly,
    };
  } catch (err) {
    console.error("[runAutomationsNowAction] échec :", err);
    return { ok: false as const, error: "Échec de l'exécution des relances." };
  }
}
