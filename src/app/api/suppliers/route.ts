import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  abbreviation: z
    .string()
    .trim()
    .min(1, "Abbreviation is required")
    .max(6, "Abbreviation is too long")
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  currentNumber: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .default(0),
});

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 422 }
    );
  }
  const { name, abbreviation, currentNumber } = parsed.data;
  if (!abbreviation) {
    return NextResponse.json(
      { error: "Abbreviation must contain letters or numbers" },
      { status: 422 }
    );
  }

  const existing = await prisma.supplier.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A supplier with this name already exists" },
      { status: 409 }
    );
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      abbreviation,
      seq: currentNumber,
      seqYear: new Date().getFullYear(),
    },
  });

  return NextResponse.json({ supplier });
}
