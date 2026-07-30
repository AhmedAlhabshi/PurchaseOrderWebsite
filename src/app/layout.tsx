import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purchase Orders",
  description: "Create, send and track purchase orders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                PO
              </span>
              <span className="text-lg font-bold text-slate-800">
                Purchase Orders
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/preparers" className="btn-secondary hidden sm:inline-flex">
                Preparers
              </Link>
              <Link href="/suppliers" className="btn-secondary">
                Suppliers
              </Link>
              <Link href="/purchase-orders/new" className="btn-primary">
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Create Purchase Order</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6">
          Diamond Tools &amp; Equipment Est. — Purchase Orders
        </footer>
      </body>
    </html>
  );
}
