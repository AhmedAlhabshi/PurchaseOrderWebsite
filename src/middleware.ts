import { NextRequest, NextResponse } from "next/server";

// Simple shared-password gate (HTTP Basic Auth). This is NOT a user-accounts
// system — it's one password for everyone, so the app can be safely exposed on
// the internet without listing purchase orders publicly.
//
// Set APP_PASSWORD (and optionally APP_USER, default "team") in the environment
// to enable it. If APP_PASSWORD is empty/unset, the gate is disabled (handy for
// local development).
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.APP_USER || "team";
  const header = req.headers.get("authorization");

  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      let decoded = "";
      try {
        decoded = atob(encoded);
      } catch {
        decoded = "";
      }
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === user && p === password) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Purchase Orders", charset="UTF-8"',
    },
  });
}

export const config = {
  // Protect everything except Next.js internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
