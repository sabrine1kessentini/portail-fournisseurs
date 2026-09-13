import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Génère un vrai PDF (minimal mais valide, table xref calculée) pour que les
 * documents de démo soient réellement téléchargeables/consultables, au lieu
 * de pointer vers un chemin de storage inexistant.
 */
function buildDemoPdf(title: string, lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const body = [
    `BT /F1 16 Tf 50 740 Td (${escape(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 11 Tf 50 ${705 - i * 18} Td (${escape(line)}) Tj ET`),
  ].join("\n");

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function uploadDemoDocument(path: string, title: string, lines: string[]) {
  const pdf = buildDemoPdf(title, lines);
  const { error } = await supabase.storage.from(BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`Échec upload storage (${path}) : ${error.message}`);
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
    data: { name: "Atlas Composants", email: "contact@atlas-composants.demo", locale: "fr" },
  });
  const nordic = await prisma.supplier.create({
    data: { name: "Nordic Parts AB", email: "orders@nordicparts.demo", locale: "en" },
  });
  const pacific = await prisma.supplier.create({
    data: { name: "Pacific Trading Co", email: "sales@pacifictrading.demo", locale: "en" },
  });
  // Quatrième fournisseur : performance en baisse (litiges, retards) pour
  // contraster avec Nordic (fiable) dans le scorecard — utile pour illustrer
  // "une entreprise qui contrôle ses fournisseurs". Héberge aussi les cas
  // limites de lien magique non couverts ailleurs (expiré, révoqué manuel).
  const delta = await prisma.supplier.create({
    data: { name: "Delta Hydraulique", email: "contact@delta-hydraulique.demo", locale: "fr" },
  });

  // ───────────────────────── PO-2026-001 (Atlas, EUR) ─────────────────────
  // Référence utilisée par scripts/smoke-test.ts : garder exactement une
  // ligne "date_proposed" en attente de validation (approuvée par le test).
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

  // ───────────────────────── PO-2026-002 (Atlas, EUR) ─────────────────────
  // Partielle déjà validée (avec historique résolu, pour l'affichage de
  // l'historique complet) + litige (purement informatif, sans entrée
  // d'historique — un litige n'attend pas de décision valider/rejeter) +
  // document expiré qui bloque la réception.
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

  // Historique résolu de la quantité réduite (approuvée par l'acheteur) :
  // démontre le workflow "quantité proposée → validation acheteur" une fois
  // la décision déjà prise (par opposition au cas encore pending sur Delta).
  await prisma.orderLineHistory.create({
    data: {
      orderLineId: order2.lines[0].id,
      field: "confirmedQuantity",
      oldValue: "150",
      newValue: "90",
      reason: "Rupture de stock partielle chez le fondeur.",
      changedByType: "supplier",
      validationStatus: "approved",
      validatedById: buyer.id,
      validatedAt: daysFromNow(-2),
    },
  });

  await uploadDemoDocument(
    `${atlas.id}/${order2.id}/certificat-conformite-expired.pdf`,
    "Certificat de conformité — Atlas Composants",
    ["Commande PO-2026-002", "Ligne : Faisceau électrique FX-12", "Statut : EXPIRÉ — réception bloquée"]
  );
  await prisma.document.create({
    data: {
      orderId: order2.id,
      supplierId: atlas.id,
      type: "certificate",
      fileUrl: `${atlas.id}/${order2.id}/certificat-conformite-expired.pdf`,
      fileName: "certificat-conformite-expired.pdf",
      status: "expired",
      expiresAt: daysFromNow(-5),
    },
  });

  await uploadDemoDocument(
    `${atlas.id}/${order1.id}/packing-list-v1.pdf`,
    "Packing list (v1, remplacée) — Atlas Composants",
    ["Commande PO-2026-001"]
  );
  const oldPackingList = await prisma.document.create({
    data: {
      orderId: order1.id,
      supplierId: atlas.id,
      type: "packing_list",
      fileUrl: `${atlas.id}/${order1.id}/packing-list-v1.pdf`,
      fileName: "packing-list-v1.pdf",
      status: "superseded",
      expiresAt: daysFromNow(-20),
    },
  });
  await uploadDemoDocument(
    `${atlas.id}/${order1.id}/packing-list-v2.pdf`,
    "Packing list (v2, à jour) — Atlas Composants",
    ["Commande PO-2026-001"]
  );
  await prisma.document.create({
    data: {
      orderId: order1.id,
      supplierId: atlas.id,
      type: "packing_list",
      fileUrl: `${atlas.id}/${order1.id}/packing-list-v2.pdf`,
      fileName: "packing-list-v2.pdf",
      status: "valid",
      expiresAt: daysFromNow(180),
      replacesId: oldPackingList.id,
    },
  });

  // ───────────────────── PO-2026-005 (Atlas, TND) ──────────────────────────
  // Même fournisseur qu'order1/order2 (EUR), devise différente sur cette
  // commande-ci : pas de conversion, chaque commande garde la sienne.
  await prisma.order.create({
    data: {
      reference: "PO-2026-005",
      supplierId: atlas.id,
      currency: "TND",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Câblage sur mesure CB-TN-1",
            quantity: 800,
            unitPrice: 6.9,
            requestedDate: daysFromNow(20),
            status: "pending",
          },
        ],
      },
    },
  });

  // ───────────────────────── PO-2026-000 (Atlas, annulée) ──────────────────
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

  // ───────────────────────── PO-2026-003 (Nordic, EUR) ─────────────────────
  // Référence utilisée par scripts/smoke-test.ts (flux fournisseur, locale
  // EN) : garder une ligne "pending" acceptable telle quelle.
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

  await uploadDemoDocument(
    `${nordic.id}/${order3.id}/packing-list.pdf`,
    "Packing list — Nordic Parts AB",
    ["Order PO-2026-003", "Status: expiring in 4 days"]
  );
  await prisma.document.create({
    data: {
      orderId: order3.id,
      supplierId: nordic.id,
      type: "packing_list",
      fileUrl: `${nordic.id}/${order3.id}/packing-list.pdf`,
      fileName: "packing-list.pdf",
      status: "expiring_urgent",
      expiresAt: daysFromNow(4),
    },
  });

  // ───────────────────── PO-2026-007 (Nordic, EUR) ─────────────────────────
  // Commande entièrement soldée (réceptionnée) : renforce le profil "bon
  // élève" de Nordic dans le scorecard et illustre le cycle complet.
  const order7 = await prisma.order.create({
    data: {
      reference: "PO-2026-007",
      supplierId: nordic.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Aluminium extrusion AE-14",
            quantity: 300,
            unitPrice: 5.6,
            requestedDate: daysFromNow(-10),
            confirmedQuantity: 300,
            status: "confirmed",
            receivedAt: daysFromNow(-9),
          },
          {
            designation: "Gasket kit GK-2",
            quantity: 150,
            unitPrice: 1.9,
            requestedDate: daysFromNow(-8),
            confirmedQuantity: 150,
            status: "confirmed",
            receivedAt: daysFromNow(-7),
          },
        ],
      },
    },
  });
  void order7;

  // ───────────────────────── PO-2026-004 (Pacific, TND) ────────────────────
  const order4 = await prisma.order.create({
    data: {
      reference: "PO-2026-004",
      supplierId: pacific.id,
      currency: "TND",
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

  await uploadDemoDocument(
    `${pacific.id}/${order4.id}/proforma-invoice.pdf`,
    "Proforma invoice — Pacific Trading Co",
    ["Order PO-2026-004", "Status: expiring in 14 days"]
  );
  await prisma.document.create({
    data: {
      orderId: order4.id,
      supplierId: pacific.id,
      type: "proforma_invoice",
      fileUrl: `${pacific.id}/${order4.id}/proforma-invoice.pdf`,
      fileName: "proforma-invoice.pdf",
      status: "expiring_soon",
      expiresAt: daysFromNow(14),
    },
  });

  // ──────────────────── PO-2026-006 (Delta Hydraulique, EUR) ───────────────
  // Commande "vitrine" de l'historique complet : une proposition de quantité
  // encore en attente, une proposition de date déjà validée, une proposition
  // de date déjà rejetée, et un litige — les 4 cas de figure sur une même
  // commande pour tester l'écran d'historique en un coup d'œil.
  const order6 = await prisma.order.create({
    data: {
      reference: "PO-2026-006",
      supplierId: delta.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      lines: {
        create: [
          {
            designation: "Vérin hydraulique VH-250",
            quantity: 200,
            unitPrice: 68,
            requestedDate: daysFromNow(18),
            status: "quantity_proposed",
          },
          {
            designation: "Flexible haute pression FHP-8",
            quantity: 500,
            unitPrice: 3.4,
            requestedDate: daysFromNow(24),
            confirmedQuantity: 500,
            status: "confirmed",
          },
          {
            designation: "Raccord inox RX-14",
            quantity: 900,
            unitPrice: 1.15,
            requestedDate: daysFromNow(16),
            status: "pending",
          },
          {
            designation: "Joint torique JT-3",
            quantity: 1500,
            unitPrice: 0.35,
            requestedDate: daysFromNow(10),
            status: "disputed",
            reason: "Diamètre hors tolérance sur le lot reçu.",
          },
        ],
      },
    },
    include: { lines: true },
  });

  const [vh250, fhp8, rx14] = order6.lines;

  // Quantité proposée : encore en attente de décision acheteur.
  await prisma.orderLineHistory.create({
    data: {
      orderLineId: vh250.id,
      field: "confirmedQuantity",
      oldValue: "200",
      newValue: "150",
      reason: "Stock partiel disponible, complément livrable sous 3 semaines.",
      changedByType: "supplier",
      validationStatus: "pending",
    },
  });

  // Date proposée : déjà validée par l'acheteur (ligne passée "confirmée").
  const fhp8OldDate = daysFromNow(14);
  await prisma.orderLineHistory.create({
    data: {
      orderLineId: fhp8.id,
      field: "requestedDate",
      oldValue: fhp8OldDate.toISOString(),
      newValue: fhp8.requestedDate.toISOString(),
      reason: "Délai transport routier allongé.",
      changedByType: "supplier",
      validationStatus: "approved",
      validatedById: buyer.id,
      validatedAt: daysFromNow(-1),
    },
  });

  // Date proposée : rejetée par l'acheteur (ligne revenue "en attente").
  const rx14ProposedDate = daysFromNow(35);
  await prisma.orderLineHistory.create({
    data: {
      orderLineId: rx14.id,
      field: "requestedDate",
      oldValue: rx14.requestedDate.toISOString(),
      newValue: rx14ProposedDate.toISOString(),
      reason: "Retard non justifié, délai initial maintenu par l'acheteur.",
      changedByType: "supplier",
      validationStatus: "rejected",
      validatedById: buyer.id,
      validatedAt: daysFromNow(-1),
    },
  });

  await uploadDemoDocument(
    `${delta.id}/${order6.id}/facture-proforma.pdf`,
    "Facture pro forma — Delta Hydraulique",
    ["Commande PO-2026-006"]
  );
  await prisma.document.create({
    data: {
      orderId: order6.id,
      supplierId: delta.id,
      type: "proforma_invoice",
      fileUrl: `${delta.id}/${order6.id}/facture-proforma.pdf`,
      fileName: "facture-proforma.pdf",
      status: "valid",
      expiresAt: daysFromNow(120),
    },
  });

  // ──────── Commandes historiques (période précédente, J-150) ─────────────
  // Alimentent la tendance du scorecard (comparaison période courante vs
  // équivalente précédente) : sans lignes dans cette fenêtre, la tendance
  // reste toujours "—". Champs de date volontairement forcés dans le passé.
  const HISTORY_DATE = daysFromNow(-150);

  await prisma.order.create({
    data: {
      reference: "PO-2026-090",
      supplierId: atlas.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      createdAt: HISTORY_DATE,
      lines: {
        create: [
          {
            designation: "Ancienne ligne — vis inox",
            quantity: 1000,
            unitPrice: 0.2,
            requestedDate: daysFromNow(-140),
            confirmedQuantity: 1000,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — rondelle",
            quantity: 2000,
            unitPrice: 0.05,
            requestedDate: daysFromNow(-138),
            confirmedQuantity: 2000,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — écrou frein",
            quantity: 500,
            unitPrice: 0.3,
            requestedDate: daysFromNow(-135),
            confirmedQuantity: 500,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — support",
            quantity: 100,
            unitPrice: 5,
            requestedDate: daysFromNow(-130),
            status: "disputed",
            reason: "Non-conformité relevée à l'époque.",
            createdAt: HISTORY_DATE,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      reference: "PO-2026-091",
      supplierId: nordic.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      createdAt: HISTORY_DATE,
      lines: {
        create: [
          {
            designation: "Ancienne ligne — bracket",
            quantity: 400,
            unitPrice: 1.1,
            requestedDate: daysFromNow(-140),
            confirmedQuantity: 400,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — foam",
            quantity: 200,
            unitPrice: 2.4,
            requestedDate: daysFromNow(-138),
            status: "pending",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — screws",
            quantity: 800,
            unitPrice: 0.1,
            requestedDate: daysFromNow(-135),
            status: "pending",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — coating",
            quantity: 150,
            unitPrice: 3.2,
            requestedDate: daysFromNow(-130),
            confirmedQuantity: 150,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      reference: "PO-2026-092",
      supplierId: pacific.id,
      currency: "TND",
      status: "issued",
      createdById: buyer.id,
      createdAt: HISTORY_DATE,
      lines: {
        create: [
          {
            designation: "Ancienne ligne — board",
            quantity: 100,
            unitPrice: 12,
            requestedDate: daysFromNow(-140),
            confirmedQuantity: 100,
            status: "confirmed",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — module",
            quantity: 60,
            unitPrice: 30,
            requestedDate: daysFromNow(-135),
            status: "pending",
            createdAt: HISTORY_DATE,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      reference: "PO-2026-093",
      supplierId: delta.id,
      currency: "EUR",
      status: "issued",
      createdById: buyer.id,
      createdAt: HISTORY_DATE,
      lines: {
        create: [
          {
            designation: "Ancienne ligne — vérin",
            quantity: 80,
            unitPrice: 60,
            requestedDate: daysFromNow(-140),
            status: "disputed",
            reason: "Retard de livraison de 3 semaines.",
            createdAt: HISTORY_DATE,
          },
          {
            designation: "Ancienne ligne — flexible",
            quantity: 300,
            unitPrice: 3,
            requestedDate: daysFromNow(-135),
            status: "disputed",
            reason: "Pression de service non conforme.",
            createdAt: HISTORY_DATE,
          },
        ],
      },
    },
  });

  // ─────────────────────── Liens magiques de démonstration ────────────────
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
  const deltaToken = await createDemoLink(delta.id, null);

  // Cas limite "lien transféré" : lien séparé, déjà bloqué comme il le
  // serait réellement après qu'un deuxième contexte navigateur (sans le
  // cookie du détenteur d'origine) ait tenté de l'ouvrir.
  const blockedDemoToken = generateToken();
  const blockedDemoLink = await prisma.magicLink.create({
    data: {
      tokenHash: hashToken(blockedDemoToken),
      supplierId: atlas.id,
      orderId: null,
      expiresAt: daysFromNow(21),
      createdById: buyer.id,
      openedAt: daysFromNow(-1),
      revoked: true,
      revokedReason: "forwarded",
    },
  });
  await prisma.orderAccessLog.createMany({
    data: [
      { magicLinkId: blockedDemoLink.id, ip: "203.0.113.10", userAgent: "Mozilla/5.0 (Windows)" },
      { magicLinkId: blockedDemoLink.id, ip: "203.0.113.10", userAgent: "Mozilla/5.0 (iPhone)" },
    ],
  });

  // Cas limite "lien expiré" : jamais ouvert, date d'expiration passée.
  await prisma.magicLink.create({
    data: {
      tokenHash: hashToken(generateToken()),
      supplierId: pacific.id,
      orderId: null,
      expiresAt: daysFromNow(-3),
      createdById: buyer.id,
    },
  });

  // Cas limite "lien révoqué manuellement" : révocation volontaire par
  // l'acheteur, distincte du blocage automatique "transféré".
  await prisma.magicLink.create({
    data: {
      tokenHash: hashToken(generateToken()),
      supplierId: delta.id,
      orderId: null,
      expiresAt: daysFromNow(21),
      createdById: buyer.id,
      openedAt: daysFromNow(-4),
      revoked: true,
      revokedReason: "manual",
    },
  });

  console.log("\nDonnées de démonstration créées.");
  console.log("Connexion acheteur : achats@demo.local / Demo1234!\n");
  console.log("Liens fournisseurs actifs (valables 21 jours) :");
  console.log(`  Atlas Composants   -> /f/${atlasToken}`);
  console.log(`  Nordic Parts AB    -> /f/${nordicToken}`);
  console.log(`  Pacific Trading Co -> /f/${pacificToken}`);
  console.log(`  Delta Hydraulique  -> /f/${deltaToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
