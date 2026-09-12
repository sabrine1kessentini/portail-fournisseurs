import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const orderLineInputSchema = z.object({
  designation: z.string().min(1, "Désignation requise"),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().nonnegative("Prix invalide"),
  requestedDate: z.coerce.date(),
});

export const createOrderSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  supplierId: z.string().min(1, "Fournisseur requis"),
  currency: z.enum(["EUR", "USD", "TND"]),
  lines: z.array(orderLineInputSchema).min(1, "Au moins une ligne requise"),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email(),
  defaultCurrency: z.enum(["EUR", "USD", "TND"]),
});

export const lineConfirmationSchema = z
  .object({
    orderLineId: z.string().min(1),
    action: z.enum(["accept", "propose_date", "dispute"]),
    confirmedQuantity: z.coerce.number().int().nonnegative().optional(),
    proposedDate: z.coerce.date().optional(),
    reason: z.string().optional(),
  })
  .refine(
    (data) => data.action !== "propose_date" || (data.proposedDate && data.reason),
    { message: "Une nouvelle date proposée nécessite un motif.", path: ["reason"] }
  )
  .refine((data) => data.action !== "dispute" || !!data.reason, {
    message: "Un litige nécessite un motif.",
    path: ["reason"],
  });

export const documentUploadSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(["proforma_invoice", "certificate", "packing_list"]),
  expiresAt: z.coerce.date().optional(),
  replacesId: z.string().optional(),
});

export const validationDecisionSchema = z.object({
  historyId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});
