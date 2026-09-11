import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Nettoyage des données existantes…");
  await prisma.$transaction([
    prisma.orderAccessLog.deleteMany(),
    prisma.supplierSession.deleteMany(),
    prisma.magicLink.deleteMany(),
    prisma.orderLineHistory.deleteMany(),
    prisma.document.deleteMany(),
    prisma.alertDigest.deleteMany(),
    prisma.orderLine.deleteMany(),
    prisma.order.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.buyer.deleteMany(),
  ]);

  const buyer = await prisma.buyer.create({
    data: {
      email: "achats@demo.local",
      passwordHash: await bcrypt.hash("Demo1234!", 10),
      name: "Camille Dupont",
      locale: "fr",
    },
  });

  const atlas = await prisma.supplier.create({
    data: { name: "Atlas Composants", email: "contact@atlas-composants.demo", defaultCurrency: "EUR", locale: "fr" },
  });
  const nordic = await prisma.supplier.create({
    data: { name: "Nordic Parts AB", email: "orders@nordicparts.demo", defaultCurrency: "EUR", locale: "en" },
  });
  const pacific = await prisma.supplier.create({
    data: { name: "Pacific Trading Co", email: "sales@pacifictrading.demo", defaultCurrency: "USD", locale: "en" },
  });

  // --- Commande 1 (Atlas, EUR) : mix confirmée / date proposée en attente / en attente ---
  const order1 = await prisma.order.create({
    data: {
      reference: "PO-2026-001",
      supplierId: atlas.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Carte contrôleur CTL-200",
            quantity: 500,
            unitPrice: 12.5,
            requestedDate: daysFromNow(30),
            confirmedQuantity: 500,
            status: "confirmed",
          },
          {
            designation: "Connecteur haute densité HD-9",
            quantity: 2000,
            unitPrice: 0.85,
            requestedDate: daysFromNow(20),
            proposedDate: daysFromNow(28),
            reason: "Rupture composant chez notre sous-traitant, délai supplémentaire nécessaire.",
            status: "date_proposed",
          },
          {
            designation: "Boîtier aluminium BX-40",
            quantity: 300,
            unitPrice: 4.2,
            requestedDate: daysFromNow(25),
            status: "pending",
          },
        ],
      },
    },
    include: { lines: true },
  });

  const l2 = order1.lines[1];
  await prisma.orderLineHistory.create({
    data: {
      orderLineId: l2.id,
      field: "requestedDate",
      oldValue: l2.requestedDate.toISOString(),
      newValue: l2.proposedDate!.toISOString(),
      reason: l2.reason,
      changedByType: "supplier",
      validationStatus: "pending",
    },
  });

  // --- Commande 2 (Atlas, EUR) : partielle + litige + document expiré bloquant ---
  const order2 = await prisma.order.create({
    data: {
      reference: "PO-2026-002",
      supplierId: atlas.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Faisceau électrique FX-12",
            quantity: 150,
            unitPrice: 22,
            requestedDate: daysFromNow(15),
            confirmedQuantity: 90,
            status: "partially_confirmed",
            receptionBlocked: true,
          },
          {
            designation: "Capot de protection CP-3",
            quantity: 400,
            unitPrice: 3.1,
            requestedDate: daysFromNow(18),
            status: "disputed",
            reason: "Écart de spécification constaté sur l'échantillon reçu.",
          },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.orderLineHistory.create({
    data: {
      orderLineId: order2.lines[1].id,
      field: "status",
      oldValue: "pending",
      newValue: "disputed",
      reason: order2.lines[1].reason,
      changedByType: "supplier",
      validationStatus: "rejected",
      validatedById: buyer.id,
      validatedAt: new Date(),
    },
  });

  // Document expiré et jamais remplacé : bloque la réception de la ligne
  // ci-dessus (cas limite "blocage réception"), volontairement non résolu.
  await prisma.document.create({
    data: {
      orderId: order2.id,
      supplierId: atlas.id,
      type: "certificate",
      fileUrl: "demo/atlas-certificate-expired.pdf",
      fileName: "certificate-conformite-expired.pdf",
      status: "expired",
      expiresAt: daysFromNow(-5),
    },
  });

  // Cas limite "document de remplacement" : distinct de la ligne bloquée
  // ci-dessus pour ne pas interférer (le blocage est géré au niveau de la
  // commande, voir README §7). Reflète l'état réel après un remplacement :
  // l'ancien document passe "superseded", le nouveau est "valid".
  const oldPackingList = await prisma.document.create({
    data: {
      orderId: order1.id,
      supplierId: atlas.id,
      type: "packing_list",
      fileUrl: "demo/atlas-packing-list-v1.pdf",
      fileName: "packing-list-v1.pdf",
      status: "superseded",
      expiresAt: daysFromNow(-20),
    },
  });
  await prisma.document.create({
    data: {
      orderId: order1.id,
      supplierId: atlas.id,
      type: "packing_list",
      fileUrl: "demo/atlas-packing-list-v2.pdf",
      fileName: "packing-list-v2.pdf",
      status: "valid",
      expiresAt: daysFromNow(180),
      replacesId: oldPackingList.id,
    },
  });

  // --- Commande annulée (cas limite) ---
  await prisma.order.create({
    data: {
      reference: "PO-2026-000",
      supplierId: atlas.id,
      currency: "EUR",
      status: "cancelled",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Prototype série 0",
            quantity: 10,
            unitPrice: 150,
            requestedDate: daysFromNow(-10),
            status: "cancelled",
          },
        ],
      },
    },
  });

  // --- Commande Nordic (EUR, fournisseur locale EN) : document J-5 ---
  const order3 = await prisma.order.create({
    data: {
      reference: "PO-2026-003",
      supplierId: nordic.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Steel bracket SB-77",
            quantity: 1000,
            unitPrice: 1.4,
            requestedDate: daysFromNow(12),
            confirmedQuantity: 1000,
            status: "confirmed",
          },
          {
            designation: "Insulation foam IF-9",
            quantity: 600,
            unitPrice: 2.75,
            requestedDate: daysFromNow(22),
            status: "pending",
          },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      orderId: order3.id,
      supplierId: nordic.id,
      type: "packing_list",
      fileUrl: "demo/nordic-packing-list.pdf",
      fileName: "packing-list.pdf",
      status: "expiring_urgent",
      expiresAt: daysFromNow(4),
    },
  });

  // --- Commande Pacific (USD) : devise différente ---
  const order4 = await prisma.order.create({
    data: {
      reference: "PO-2026-004",
      supplierId: pacific.id,
      currency: "USD",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Circuit board CB-500",
            quantity: 250,
            unitPrice: 18.9,
            requestedDate: daysFromNow(35),
            status: "pending",
          },
          {
            designation: "Power module PM-22",
            quantity: 120,
            unitPrice: 45,
            requestedDate: daysFromNow(40),
            confirmedQuantity: 120,
            status: "confirmed",
          },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      orderId: order4.id,
      supplierId: pacific.id,
      type: "proforma_invoice",
      fileUrl: "demo/pacific-proforma.pdf",
      fileName: "proforma-invoice.pdf",
      status: "expiring_soon",
      expiresAt: daysFromNow(14),
    },
  });

  // --- Liens magiques de démonstration ---
  async function createDemoLink(supplierId: string, orderId: string | null) {
    const token = generateToken();
    await prisma.magicLink.create({
      data: {
        tokenHash: hashToken(token),
        supplierId,
        orderId,
        expiresAt: daysFromNow(21),
        createdById: buyer.id,
      },
    });
    return token;
  }

  const atlasToken = await createDemoLink(atlas.id, null);
  const nordicToken = await createDemoLink(nordic.id, null);
  const pacificToken = await createDemoLink(pacific.id, null);

  // Journalise deux accès depuis des IP différentes sur le lien Atlas pour
  // illustrer le suivi "lien transféré" visible côté acheteur.
  const atlasLink = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(atlasToken) } });
  if (atlasLink) {
    await prisma.orderAccessLog.createMany({
      data: [
        { magicLinkId: atlasLink.id, ip: "203.0.113.10", userAgent: "Mozilla/5.0 (Windows)" },
        { magicLinkId: atlasLink.id, ip: "198.51.100.42", userAgent: "Mozilla/5.0 (iPhone)" },
      ],
    });
    await prisma.magicLink.update({ where: { id: atlasLink.id }, data: { openedAt: new Date() } });
  }

  console.log("\nDonnées de démonstration créées.");
  console.log("Connexion acheteur : achats@demo.local / Demo1234!\n");
  console.log("Liens fournisseurs (valables 21 jours) :");
  console.log(`  Atlas Composants   -> /f/${atlasToken}`);
  console.log(`  Nordic Parts AB    -> /f/${nordicToken}`);
  console.log(`  Pacific Trading Co -> /f/${pacificToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
