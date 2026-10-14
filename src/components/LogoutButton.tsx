"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/login"); router.refresh();
    } catch { setError("Could not sign out. Try again."); setBusy(false); }
  }
  return <div><button className="btn-secondary" disabled={busy} onClick={logout}>{busy ? "Signing out…" : "Sign out"}</button>{error && <p className="error-text" role="alert">{error}</p>}</div>;
}
