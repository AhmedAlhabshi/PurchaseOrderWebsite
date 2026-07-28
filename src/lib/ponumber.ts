import { prisma } from "./db";

// PO number format: PO-DIT-026-TYR-018
//  - "DIT"  fixed company code (Diamond Tools)
//  - "026"  the year (2026 -> 026, 2027 -> 027)
//  - "TYR"  the supplier abbreviation
//  - "018"  a per-supplier counter that resets each calendar year

export const COMPANY_CODE = "DIT";

export function yearSegment(year: number): string {
  return String(year % 1000).padStart(3, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function buildPoNumber(
  abbreviation: string,
  year: number,
  seq: number
): string {
  return `PO-${COMPANY_CODE}-${yearSegment(year)}-${abbreviation}-${pad3(seq)}`;
}

// The number a supplier's NEXT purchase order would get, without committing.
export function previewNextNumber(
  supplier: { abbreviation: string; seq: number; seqYear: number },
  year = new Date().getFullYear()
): string {
  const base = supplier.seqYear === year ? supplier.seq : 0;
  return buildPoNumber(supplier.abbreviation, year, base + 1);
}

// Atomically reserves the next number for a supplier (increments its counter,
// resetting when the year rolls over). Returns the committed PO number.
export async function reserveNextNumber(supplierId: string): Promise<string> {
  const year = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new Error("Supplier not found");
    const base = supplier.seqYear === year ? supplier.seq : 0;
    const next = base + 1;
    await tx.supplier.update({
      where: { id: supplierId },
      data: { seq: next, seqYear: year },
    });
    return buildPoNumber(supplier.abbreviation, year, next);
  });
}
