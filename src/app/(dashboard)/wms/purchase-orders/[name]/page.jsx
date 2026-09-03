"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}

const STATUS_TONE = { Draft: "bg-slate-100 text-slate-700", "To Receive and Bill": "bg-amber-100 text-amber-700", "To Receive": "bg-amber-100 text-amber-700", "To Bill": "bg-cyan-100 text-cyan-700", Completed: "bg-emerald-100 text-emerald-700", Cancelled: "bg-rose-100 text-rose-700", Closed: "bg-slate-200 text-slate-600" };

export default function WmsPurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      setError("");
      const response = await fetch(`/api/wms/purchase-orders/${encodeURIComponent(params.name)}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load this Purchase Order.");
      setDoc(payload.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load this Purchase Order.");
    }
  }

  useEffect(() => { load(); }, [params.name]);

  async function submitDraft() {
    try {
      setSubmitting(true); setNotice(null);
      const response = await fetch(`/api/wms/purchase-orders/${encodeURIComponent(params.name)}`, { method: "PATCH", headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to submit this Purchase Order.");
      setNotice({ tone: "success", message: payload.message });
      await load();
    } catch (submitError) {
      setNotice({ tone: "error", message: submitError.message || "Unable to submit this Purchase Order." });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p className="font-bold">Unable to load Purchase Order</p><p className="mt-1">{error}</p></div>;
  if (!doc) return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading Purchase Order...</div>;

  const isDraft = Number(doc.docstatus) === 0;
  const isOpen = Number(doc.docstatus) === 1 && ["To Receive and Bill", "To Receive"].includes(doc.status);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white md:flex-row md:items-end md:p-8">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Purchase Order</p><h1 className="mt-2 text-3xl font-bold">{doc.name}</h1><p className="mt-2 text-sm text-slate-300">{doc.supplier_name || doc.supplier}</p></div>
        <span className={`w-max rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_TONE[doc.status] || "bg-slate-100 text-slate-700"}`}>{isDraft ? "Draft" : doc.status}</span>
      </section>

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div><p className="text-xs font-bold uppercase text-slate-400">Order date</p><p className="mt-1 text-sm font-semibold text-slate-800">{doc.transaction_date}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Required by</p><p className="mt-1 text-sm font-semibold text-slate-800">{doc.schedule_date}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Target warehouse</p><p className="mt-1 text-sm font-semibold text-slate-800">{doc.set_warehouse || "-"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Grand total</p><p className="mt-1 text-sm font-semibold text-slate-800">{money(doc.grand_total, doc.currency)}</p></div>
        </div>
        {isDraft || isOpen ? <div className="mt-6 flex flex-wrap gap-3">
          {isDraft ? <button type="button" disabled={submitting} onClick={submitDraft} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Submitting..." : "Submit to ERPNext"}</button> : null}
          {isOpen ? <Link href={`/wms/grn/new?po=${encodeURIComponent(doc.name)}`} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950">Create GRN against this PO</Link> : null}
        </div> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold">Items</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{["Item", "Ordered", "Received", "UOM", "Rate", "Warehouse"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(doc.items || []).map((row) => (
              <tr key={row.name}><td className="px-4 py-3.5 text-sm"><p className="font-semibold text-slate-900">{row.item_name}</p><p className="text-xs text-slate-500">{row.item_code}</p></td><td className="px-4 py-3.5 text-sm text-slate-700">{row.qty}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.received_qty || 0}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.uom}</td><td className="px-4 py-3.5 text-sm text-slate-700">{money(row.rate, doc.currency)}</td><td className="px-4 py-3.5 text-sm text-slate-700">{row.warehouse || doc.set_warehouse || "-"}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
