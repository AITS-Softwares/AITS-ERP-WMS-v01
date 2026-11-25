"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export default function StockInPage() {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState("");
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState("1");
  const [warehouse, setWarehouse] = useState("");
  const [company, setCompany] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);

  async function scan(event) {
    event.preventDefault();
    if (!barcode.trim() || busy) return;
    setBusy(true); setNotice(null); setLastEntry(null);
    try {
      const response = await fetch(`/api/wms/barcode-lookup?code=${encodeURIComponent(barcode.trim())}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Barcode was not recognized.");
      const found = payload.data;
      setItem(found);
      setQty(String(found.conversionFactor || 1));
      const companyResponse = await fetch("/api/wms/companies?pageSize=100", { headers: authHeaders() });
      const companyPayload = await companyResponse.json().catch(() => ({}));
      if (!companyResponse.ok) throw new Error(companyPayload.message || "Could not load ERPNext companies.");
      const companies = companyPayload.data?.records || [];
      setCompanies(companies);
      if (!companies.length) throw new Error("No ERPNext company is available for a Stock Entry.");
      if (companies.length === 1) await selectCompany(companies[0].name);
      setNotice({ message: "Barcode scanned. Confirm the receiving details, then add the Stock Entry." });
    } catch (error) { setItem(null); setNotice({ error: true, message: error.message }); }
    finally { setBarcode(""); setBusy(false); requestAnimationFrame(() => inputRef.current?.focus()); }
  }

  async function selectCompany(name) {
    setCompany(name);
    setWarehouse("");
    setWarehouses([]);
    if (!name) return;
    const response = await fetch(`/api/wms/warehouses?pageSize=100&company=${encodeURIComponent(name)}`, { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Could not load warehouses for this company.");
    const rows = (payload.data?.records || []).filter((row) => !row.is_group);
    setWarehouses(rows);
    if (rows.length === 1) setWarehouse(rows[0].name);
  }

  async function submit(event) {
    event.preventDefault();
    if (!item || busy) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/wms/stock-in", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ itemCode: item.itemCode, qty, warehouse, company, postingDate, remarks }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not submit the Stock Entry.");
      setLastEntry({ name: payload.data.name, itemCode: item.itemCode, itemName: item.itemName, barcode: item.barcode, qty, uom: item.stockUom || item.uom || "units", company, warehouse, postingDate, remarks: remarks.trim() || "—", status: "Submitted" });
      setNotice({ message: payload.message });
      setItem(null); setQty("1"); setRemarks(""); setBarcode("");
    } catch (error) { setNotice({ error: true, message: error.message }); }
    finally { setBusy(false); requestAnimationFrame(() => inputRef.current?.focus()); }
  }

  return <main className="mx-auto max-w-3xl space-y-6">
    <div><Link href="/wms" className="text-sm font-semibold text-cyan-700">← WMS Home</Link><h1 className="mt-3 text-3xl font-black text-slate-950">Stock In by Barcode</h1><p className="mt-2 text-slate-600">Scan the item, provide the receiving details, then submit a Material Receipt Stock Entry to ERPNext.</p></div>
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form onSubmit={scan} className="space-y-2"><label htmlFor="stock-in-barcode" className="block text-sm font-bold">Item barcode</label><div className="flex gap-2"><input id="stock-in-barcode" ref={inputRef} autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)} disabled={busy} placeholder="Scan barcode (scanner sends Enter)" className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3"/><button disabled={busy || !barcode.trim()} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Working…" : "Scan"}</button></div></form>
      {item ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-emerald-950">Scanned</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Scanned</span></div><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Item</dt><dd className="font-semibold">{item.itemName} ({item.itemCode})</dd></div><div><dt className="text-slate-500">Barcode UOM</dt><dd className="font-semibold">{item.uom || "—"} · {item.conversionFactor || 1} {item.stockUom || "units"}</dd></div></dl></div> : null}
      {item ? <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h2 className="font-bold text-slate-900">Stock In details</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-slate-500">Item</dt><dd className="font-semibold">{item.itemName} ({item.itemCode})</dd></div><div><dt className="text-slate-500">Barcode</dt><dd className="break-all font-mono text-xs font-semibold">{item.barcode}</dd></div><div><dt className="text-slate-500">Status</dt><dd><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Scanned</span></dd></div><div><dt className="text-slate-500">Quantity</dt><dd className="font-semibold">{qty || "—"} {item.stockUom || item.uom || "units"}</dd></div><div><dt className="text-slate-500">Company</dt><dd className="font-semibold">{companies.find((row) => row.name === company)?.company_name || company || "Select company"}</dd></div><div><dt className="text-slate-500">Warehouse</dt><dd className="font-semibold">{warehouses.find((row) => row.name === warehouse)?.warehouse_name || warehouse || "Select warehouse"}</dd></div><div><dt className="text-slate-500">Posting date</dt><dd className="font-semibold">{postingDate || "—"}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Remarks</dt><dd className="font-semibold">{remarks.trim() || "—"}</dd></div></dl></section> : null}
      {lastEntry ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-emerald-950">Last Stock Entry</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{lastEntry.status}</span></div><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-slate-600">ERPNext Stock Entry</dt><dd className="font-semibold">{lastEntry.name}</dd></div><div><dt className="text-slate-600">Item</dt><dd className="font-semibold">{lastEntry.itemName} ({lastEntry.itemCode})</dd></div><div><dt className="text-slate-600">Barcode</dt><dd className="break-all font-mono text-xs font-semibold">{lastEntry.barcode}</dd></div><div><dt className="text-slate-600">Quantity</dt><dd className="font-semibold">{lastEntry.qty} {lastEntry.uom}</dd></div><div><dt className="text-slate-600">Company</dt><dd className="font-semibold">{lastEntry.company}</dd></div><div><dt className="text-slate-600">Warehouse</dt><dd className="font-semibold">{lastEntry.warehouse}</dd></div><div><dt className="text-slate-600">Posting date</dt><dd className="font-semibold">{lastEntry.postingDate}</dd></div><div className="sm:col-span-2"><dt className="text-slate-600">Remarks</dt><dd className="font-semibold">{lastEntry.remarks}</dd></div></dl></section> : null}
      {item ? <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Received quantity ({item.stockUom || item.uom || "units"})<input required type="number" min="0.000001" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label><label className="text-sm font-semibold">Company<select required value={company} onChange={(e) => selectCompany(e.target.value).catch((error) => setNotice({ error: true, message: error.message }))} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Select company</option>{companies.map((row) => <option key={row.name} value={row.name}>{row.company_name || row.name}</option>)}</select></label><label className="text-sm font-semibold">Receiving warehouse<select required value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Select warehouse</option>{warehouses.map((row) => <option key={row.name} value={row.name}>{row.warehouse_name || row.name}</option>)}</select></label><label className="text-sm font-semibold">Posting date<input required type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label><label className="text-sm font-semibold">Remarks (optional)<input value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} placeholder="Reference or receiving note" className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label></div><button disabled={busy || !warehouse || !company || Number(qty) <= 0} className="w-full rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Add Stock Entry"}</button></form> : null}
      {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${notice.error ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-900"}`}>{notice.message}</p> : null}
      <p className="text-xs text-slate-500">Submitting creates and submits an ERPNext Stock Entry with purpose Material Receipt. Only the scanned item and entered receiving details are sent.</p>
    </section>
  </main>;
}
