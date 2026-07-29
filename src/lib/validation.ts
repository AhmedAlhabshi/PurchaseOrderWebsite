import { z } from "zod";

// Shared validation used by the API and (loosely) by the client form.

export const itemSchema = z.object({
  itemCode: z.string().trim().min(1, "Item code is required"),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  taxRate: z.coerce
    .number()
    .min(0, "Tax cannot be negative")
    .max(100, "Tax percent looks too high")
    .optional()
    .default(0),
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeLineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

// Tax amount for one line (line total × tax%).
export function computeLineTax(
  quantity: number,
  unitPrice: number,
  taxRate = 0
): number {
  return round2((computeLineTotal(quantity, unitPrice) * (taxRate || 0)) / 100);
}

type TaxableItem = { quantity: number; unitPrice: number; taxRate?: number };

// Sum of line totals before tax.
export function computeSubtotal(items: TaxableItem[]): number {
  return round2(
    items.reduce((sum, it) => sum + computeLineTotal(it.quantity, it.unitPrice), 0)
  );
}

// Sum of all line taxes.
export function computeTaxTotal(items: TaxableItem[]): number {
  return round2(
    items.reduce(
      (sum, it) => sum + computeLineTax(it.quantity, it.unitPrice, it.taxRate),
      0
    )
  );
}

// Grand total = subtotal + tax.
export function computeGrandTotal(items: TaxableItem[]): number {
  return round2(computeSubtotal(items) + computeTaxTotal(items));
}
