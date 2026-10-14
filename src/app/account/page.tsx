import { requireUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await requireUser("/account");
  return <section className="card mx-auto max-w-lg p-6">
    <h1 className="mb-5 text-2xl font-bold text-slate-800">My account</h1>
    <dl className="mb-5 space-y-3">{[["Name", user.name], ["Email", user.email], ["Phone", user.phone]].map(([label, value]) => <div key={label}><dt className="field-label">{label}</dt><dd className="text-slate-800 break-words">{value}</dd></div>)}</dl>
    <p className="mb-5 text-sm text-slate-500">These details are added automatically to new purchase orders. Saved orders keep their original preparer details.</p>
    <LogoutButton />
  </section>;
}
