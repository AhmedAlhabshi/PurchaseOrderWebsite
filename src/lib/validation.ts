import { z } from "zod";

// Shared validation used by the API and (loosely) by the client form.

export const itemSchema = z.object({
  itemCode: z.string().trim().min(1, "Item code is required"),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const poInputSchema = z.object({
  supplierId: z.string().trim().optional().default(""),
  revision: z.coerce.number().int().min(0).optional().default(0),
  supplierName: z.string().trim().min(1, "Supplier name is required"),
  attention: z.string().trim().optional().default(""),
  mainEmail: z.string().trim().email("Main email is not valid"),
  ccEmails: z
    .array(z.string().trim())
    .default([])
    // Drop blanks, then validate the rest are emails.
    .transform((arr) => arr.map((e) => e.trim()).filter(Boolean))
    .pipe(z.array(z.string().email("One of the CC emails is not valid"))),
  poNumber: z.string().trim().min(1, "PO number is required"),
  poDate: z.string().trim().min(1, "PO date is required"),
  deliveryMethod: z.string().trim().min(1, "Delivery method is required"),
  paymentTerms: z.string().trim().optional().default(""),
  currency: z.string().trim().min(1, "Currency is required"),
  preparedBy: z.string().trim().min(1, "Prepared by is required"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

export type POInput = z.infer<typeof poInputSchema>;

export function computeLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function computeGrandTotal(
  items: { quantity: number; unitPrice: number }[]
): number {
  const total = items.reduce(
    (sum, it) => sum + computeLineTotal(it.quantity, it.unitPrice),
    0
  );
  return Math.round(total * 100) / 100;
}
