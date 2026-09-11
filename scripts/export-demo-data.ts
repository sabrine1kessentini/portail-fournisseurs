import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

/**
 * Exporte le jeu de données de démonstration (créé par prisma/seed.ts) en
 * JSON portable — livrable demandé indépendamment du format d'implémentation.
 * Les tokens de lien magique ne sont jamais exportés (seul leur hash existe
 * en base), volontairement, pour ne pas committer un accès valide.
 */
async function main() {
  const [buyers, suppliers, orders, lines, history, documents] = await Promise.all([
    prisma.buyer.findMany({ select: { id: true, email: true, name: true, locale: true } }),
    prisma.supplier.findMany(),
    prisma.order.findMany(),
    prisma.orderLine.findMany(),
    prisma.orderLineHistory.findMany(),
    prisma.document.findMany(),
  ]);

  const exportData = {
    generatedAt: new Date().toISOString(),
    note: "Jeu de données de démonstration — voir prisma/seed.ts pour la logique de génération. `npm run db:seed` recrée cet état dans une base fraîche.",
    buyers,
    suppliers,
    orders,
    orderLines: lines,
    orderLineHistory: history,
    documents,
  };

  const outPath = path.join(process.cwd(), "demo-data", "export.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`Export écrit dans ${outPath}`);
  await prisma.$disconnect();
}

main();
