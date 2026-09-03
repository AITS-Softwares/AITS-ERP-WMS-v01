"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiBox, FiClipboard, FiDatabase, FiGrid, FiLink, FiMapPin, FiShoppingCart, FiTag } from "react-icons/fi";

// Ordered by how often a warehouse operator uses each screen.
const navigation = [
  { href: "/wms", label: "Control Center", shortLabel: "Home", icon: FiGrid },
  { href: "/wms/purchase-orders", label: "Purchase Orders", shortLabel: "Orders", icon: FiShoppingCart },
  { href: "/wms/grn", label: "GRN", shortLabel: "GRN", icon: FiClipboard },
  { href: "/wms/items", label: "Items", shortLabel: "Items", icon: FiBox },
  { href: "/wms/warehouses", label: "Warehouses", shortLabel: "Warehouses", icon: FiMapPin },
  { href: "/wms/carton-setup", label: "Carton Setup", shortLabel: "Cartons", icon: FiTag },
  { href: "/wms/uoms", label: "Units of Measure", shortLabel: "UOM", icon: FiDatabase },
  { href: "/wms/setup", label: "ERPNext Connection", shortLabel: "Connection", icon: FiLink },
];
const topLevelHrefs = navigation.map((item) => item.href);

// A nested page (e.g. /wms/purchase-orders/PO-0001 or /wms/grn/new) gets an
// automatic "back to the section it belongs to" link — no per-page wiring needed.
function parentHref(pathname) {
  if (topLevelHrefs.includes(pathname)) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return `/${segments.slice(0, 2).join("/")}`;
}

export default function WmsShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Session expired")))
      .then((payload) => setUser(payload.user || null))
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/signin");
      });
  }, [router]);

  if (!user) {
    return <div className="grid min-h-screen place-items-center bg-slate-950"><div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" /></div>;
  }

  const backHref = parentHref(pathname);
  const backLabel = navigation.find((item) => item.href === backHref)?.label || "Back";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-950 px-4 py-4 text-white md:px-7">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <Link href="/wms" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">W</span>
            <span><span className="block text-base font-bold tracking-wide">AITSERP WMS</span><span className="block text-xs text-slate-400">ERPNext-connected warehouse operations</span></span>
          </Link>
          <div className="hidden text-right text-sm md:block"><p className="font-semibold">{user.name || user.email}</p><p className="text-xs text-slate-400">Warehouse workspace</p></div>
        </div>
      </header>

      {backHref ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 active:text-cyan-700">
            <FiArrowLeft size={16} /> {backLabel}
          </Link>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-[calc(100vh-73px)] w-64 shrink-0 border-r border-slate-200 bg-white p-3 md:block">
          <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Warehouse</p>
          <nav className="space-y-1">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = href === "/wms" ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={17} />{label}</Link>;
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-7">{children}</main>
      </div>

      <nav className="sticky bottom-0 z-20 flex overflow-x-auto border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.06)] md:hidden">
        {navigation.map(({ href, shortLabel, icon: Icon }) => {
          const active = href === "/wms" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-semibold ${active ? "text-cyan-700" : "text-slate-500"}`}>
              <Icon size={18} />
              <span className="whitespace-nowrap">{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
