"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "@/lib/authNavigation";

export default function AuthForm({ mode, next = "/" }: { mode: "login" | "register"; next?: string }) {
  const register = mode === "register";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    if (register && form.get("password") !== form.get("confirmPassword")) {
      setError("Passwords do not match."); return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Please try again."); return; }
      router.replace(safeReturnTo(next)); router.refresh();
    } catch { setError("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="card mx-auto max-w-md p-6 sm:p-8">
    <h1 className="text-2xl font-bold text-slate-800">{register ? "Create your account" : "Welcome back"}</h1>
    <p className="mb-6 mt-2 text-sm text-slate-500">{register ? "Your details will appear automatically on the purchase orders you prepare." : "Sign in to prepare and track purchase orders."}</p>
    <form onSubmit={submit} className="space-y-4">
      {register && <div><label htmlFor="name" className="field-label">Full name</label><input id="name" name="name" className="input" required maxLength={100} autoComplete="name" /></div>}
      <div><label htmlFor="email" className="field-label">Email</label><input id="email" name="email" type="email" className="input" required maxLength={254} autoComplete="email" /></div>
      {register && <div><label htmlFor="phone" className="field-label">Phone number</label><input id="phone" name="phone" type="tel" className="input" required minLength={7} maxLength={30} autoComplete="tel" placeholder="+966 5x xxx xxxx" /></div>}
      <div><label htmlFor="password" className="field-label">Password</label><input id="password" name="password" type="password" className="input" required minLength={8} maxLength={128} autoComplete={register ? "new-password" : "current-password"} />{register && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}</div>
      {register && <div><label htmlFor="confirm-password" className="field-label">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" className="input" required minLength={8} maxLength={128} autoComplete="new-password" /></div>}
      {error && <p role="alert" className="error-text">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
    </form>
    <p className="mt-4 text-xs text-slate-500">You stay signed in on this browser for 30 days. Sign out when using a shared device.</p>
    <p className="mt-5 text-sm text-slate-600">{register ? "Already have an account? " : "New here? "}<Link className="font-semibold text-brand-600 hover:underline" href={`${register ? "/login" : "/register"}?next=${encodeURIComponent(safeReturnTo(next))}`}>{register ? "Sign in" : "Create an account"}</Link></p>
    <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Browse purchase orders</Link>
  </section>;
}
