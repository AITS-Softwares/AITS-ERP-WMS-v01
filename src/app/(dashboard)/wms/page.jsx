"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function CountCard({ label, value, description, href }) {
  return <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></Link>;
}

export default function WmsHomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/wms/dashboard", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.message || "Unable to load WMS data."); setData(payload.data); })
      .catch((loadError) => setError(loadError.message || "Unable to load WMS data."));
  }, []);

  const notConfigured = error.includes("not configured");
  return <div className="space-y-6"><section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-7 text-white shadow-lg md:p-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Phase 3 · Barcode &amp; Master Carton</p><h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">Warehouse operations, connected directly to ERPNext.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">This workspace is the new warehouse front end. ERPNext stays the only source of truth for stock, warehouses, purchase orders, UOMs, and barcode records.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/wms/purchase-orders/new" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">New Purchase Order</Link><Link href="/wms/grn/new" className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white">Record a GRN</Link><Link href="/wms/carton-setup" className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white">Item &amp; Carton Setup</Link></div></section>
    {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p className="font-bold">WMS is not connected yet</p><p className="mt-1">{error}</p>{notConfigured ? <Link href="/wms/setup" className="mt-3 inline-block font-bold underline">Open ERPNext connection setup</Link> : null}</section> : null}
    {!error && !data ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Checking live ERPNext master data...</div> : null}
    {data ? <><div className="grid gap-4 md:grid-cols-3"><CountCard label="Items" value={data.items.records.length} description="Latest live Item master records" href="/wms/items" /><CountCard label="Warehouses" value={data.warehouses.records.length} description="ERPNext warehouse locations" href="/wms/warehouses" /><CountCard label="Open Purchase Orders" value={data.purchaseOrders.records.length} description="Ready for GRN processing" href="/wms/purchase-orders" /></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">What is ready now</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>• One encrypted ERPNext connection, shared safely with Distributor.</li><li>• Read/write ERPNext Purchase Orders — create, save as draft, or submit.</li><li>• GRN screen that submits ERPNext's Purchase Receipt doctype and updates real stock.</li><li>• Master Carton UOM + conversion factor + barcode, stored on ERPNext's own Item doctype.</li><li>• Scan-to-resolve on the GRN screen: a carton barcode auto-adds the right quantity to the right line.</li><li>• No local stock balance, warehouse, or purchase-order copies created.</li></ul></section></> : null}
  </div>;
}
