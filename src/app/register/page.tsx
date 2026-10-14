import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import { safeReturnTo } from "@/lib/authNavigation";
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeReturnTo(searchParams.next);
  if (await currentUser()) redirect(next);
  return <AuthForm mode="register" next={next} />;
}
