"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default function WmsGrnDetailPage() {
  const params = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/wms/purchase-receipts/${encodeURIComponent(params.name)}`, { headers: authHeaders() })
      .then((r) => r.json().then((payload) => ({ ok: r.ok, payload })))
      .then(({ ok, payload }) => { if (!ok) throw new Error(payload.message || "Unable to load this GRN."); setDoc(payload.data); })
      .catch((loadError) => setError(loadError.message || "Unable to load this GRN."));
  }, [params.name]);

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p className="font-bold">Unable to load GRN</p><p className="mt-1">{error}</p></div>;
  if (!doc) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading GRN...</div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white md:flex-row md:items-end md:p-8 print:hidden">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">GRN · Purchase Receipt</p><h1 className="mt-2 text-3xl font-bold">{doc.name}</h1><p className="mt-2 text-sm text-slate-300">{doc.supplier_name || doc.supplier} · ERPNext status: {doc.status}</p></div>
        <button type="button" onClick={() => window.print()} className="w-max rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">Print label / receipt</button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="hidden print:block print:mb-4"><p className="text-xl font-bold">GRN {doc.name}</p><p className="text-sm">{doc.supplier_name || doc.supplier}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div><p className="text-xs font-bold uppercase text-slate-400">Posting date</p><p className="mt-1 text-sm font-semibold text-slate-800">{doc.posting_date}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Receiving warehouse</p><p className="mt-1 text-sm font-semibold text-slate-800">{doc.set_warehouse || "-"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Against Purchase Orders</p><p className="mt-1 text-sm font-semibold text-slate-800">{[...new Set((doc.items || []).map((row) => row.purchase_order).filter(Boolean))].join(", ") || "-"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Grand total</p><p className="mt-1 text-sm font-semibold text-slate-800">{money(doc.grand_total, doc.currency)}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold">Items received</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Item", "Received", "Rejected", "UOM", "Warehouse", "Batch", "Against PO"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(doc.items || []).map((row) => (
              <tr key={row.name}><td className="px-4 py-3.5 text-sm"><p className="font-semibold text-slate-900">{row.item_name}</p><p className="text-xs text-slate-500">{row.item_code}</p></td><td className="px-4 py-3.5 text-sm text-slate-700">{row.qty}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.rejected_qty || 0}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.uom}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.warehouse}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.batch_no || "-"}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.purchase_order || "-"}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
