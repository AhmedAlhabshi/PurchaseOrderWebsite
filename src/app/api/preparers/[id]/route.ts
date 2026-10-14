import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";

async function retired() {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ error: "Preparers now come from employee accounts." }, { status: 410 });
}
export const PATCH = retired;
export const DELETE = retired;
