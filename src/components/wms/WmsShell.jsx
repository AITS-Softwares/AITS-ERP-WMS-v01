"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiBarChart2, FiBox, FiChevronDown, FiClipboard, FiDatabase, FiGrid, FiLink, FiLogOut, FiMapPin, FiShoppingCart, FiTag, FiTruck } from "react-icons/fi";

// Ordered by how often a warehouse operator uses each screen.
const navigation = [
  { href: "/wms", label: "Control Center", shortLabel: "Home", icon: FiGrid },
  { href: "/wms/locations", label: "Warehouse Location Management", shortLabel: "Locations", icon: FiMapPin, children: [
    { href: "/wms/locations/analytics", label: "Dashboard" },
    { href: "/wms/locations/racks", label: "Rack Master" },
    { href: "/wms/locations/shelves", label: "Shelf Master" },
    { href: "/wms/locations/bin-locations", label: "Bin Location Master" },
    { href: "/wms/locations/reports", label: "Location Reports" },
    { href: "/wms/locations/import", label: "Bulk Data Import" },
  ] },
  { href: "/wms/purchase-orders", label: "Purchase Orders", shortLabel: "Orders", icon: FiShoppingCart },
  { href: "/wms/grn", label: "GRN", shortLabel: "GRN", icon: FiClipboard },
  { href: "/wms/items", label: "Items", shortLabel: "Items", icon: FiBox },
  { href: "/wms/warehouses", label: "Warehouses", shortLabel: "Warehouses", icon: FiMapPin },
  { href: "/wms/bin-locations", label: "Bin Locations", shortLabel: "Bins", icon: FiMapPin },
  { href: "/wms/carton-setup", label: "Carton Creation", shortLabel: "Cartons", icon: FiTag },
  { href: "/wms/sales-dispatch", label: "Sales Dispatch", shortLabel: "Dispatch", icon: FiTruck },
  { href: "/wms/reports", label: "Reports", shortLabel: "Reports", icon: FiBarChart2 },
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
  const [locationMenuOpen, setLocationMenuOpen] = useState(pathname.startsWith("/wms/locations"));

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
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/signin");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 md:h-screen md:overflow-hidden">
      <header className="z-30 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-[#10233c] to-slate-950 px-4 py-3.5 text-white shadow-lg shadow-slate-950/15 md:px-7">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <Link href="/wms" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-500 font-black text-slate-950 shadow-lg shadow-cyan-500/20">W</span>
            <span><span className="block text-base font-bold tracking-wide">AITSERP WMS</span><span className="block text-xs text-slate-300">Warehouse command center</span></span>
          </Link>
          <div className="flex items-center gap-3"><div className="hidden text-right text-sm md:block"><p className="font-semibold">{user.name || user.email}</p><p className="text-xs text-slate-300">Warehouse workspace</p></div><button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"><FiLogOut size={16} /><span className="hidden sm:inline">Logout</span></button></div>
        </div>
      </header>

      {backHref ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 active:text-cyan-700">
            <FiArrowLeft size={16} /> {backLabel}
          </Link>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1680px] md:h-[calc(100vh-73px)]">
        <aside className="hidden h-full w-[17rem] shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white p-4 md:block">
          <div className="mb-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">Workspace</p><p className="mt-1 text-sm font-bold text-slate-800">Warehouse operations</p></div>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
          <nav className="space-y-1">
            {navigation.map(({ href, label, icon: Icon, children: submenu }) => {
              const active = href === "/wms" ? pathname === href : pathname.startsWith(href);
              if (submenu) return <div key={href}><button type="button" onClick={() => setLocationMenuOpen((open) => !open)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-900 shadow-sm ring-1 ring-cyan-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={17} /><span className="flex-1">{label}</span><FiChevronDown size={16} className={`transition-transform ${locationMenuOpen ? "rotate-180" : ""}`} /></button>{locationMenuOpen ? <div className="mt-1 space-y-1 border-l border-cyan-100 py-1 pl-4">{submenu.map((item) => <Link key={item.href} href={item.href} className={`block rounded-lg px-3 py-2 text-xs font-semibold transition ${pathname === item.href ? "bg-cyan-50 text-cyan-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item.label}</Link>)}</div> : null}</div>;
              return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-900 shadow-sm ring-1 ring-cyan-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={17} />{label}</Link>;
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_28%),linear-gradient(#f8fafc,#f4f7fb)] p-4 pb-24 md:h-full md:overflow-y-auto md:p-8">{children}</main>
      </div>

      <nav className="sticky bottom-0 z-20 flex overflow-x-auto border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
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
