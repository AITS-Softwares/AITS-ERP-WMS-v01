"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import WmsBarcode from "@/components/wms/WmsBarcode";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const fieldClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

function statusFor(record) {
  if (record.expiryDate && new Date(record.expiryDate).getTime() < Date.now()) return "Expired";
  return record.status || "Generated";
}

export default function WmsBarcodeMaster() {
  const [itemSearch, setItemSearch] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState("");
  const [cartonSize, setCartonSize] = useState("1");
  const [cartonFactorLoading, setCartonFactorLoading] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadRecords = useCallback(async (term = search) => {
    const response = await fetch(`/api/wms/barcode-master?${new URLSearchParams(term ? { search: term } : {})}`, { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Unable to load barcode records.");
    setRecords(payload.data || []);
  }, [search]);

  useEffect(() => { loadRecords().catch((error) => setNotice({ error: true, message: error.message })); }, [loadRecords]);

  useEffect(() => {
    let live = true;
    const term = itemSearch.trim();
    if (!term) {
      setItems([]);
      return () => { live = false; };
    }
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ pageSize: "50", search: term });
        const response = await fetch(`/api/wms/items?${query}`, { headers: authHeaders() });
        const payload = await response.json().catch(() => ({}));
        if (live) setItems(payload.data?.records || []);
      } catch { if (live) setItems([]); }
    }, 250);
    return () => { live = false; window.clearTimeout(timer); };
  }, [itemSearch]);


  useEffect(() => {
    if (!selected) {
      setCartonSize("1");
      setCartonFactorLoading(false);
      return;
    }
    let live = true;
    setCartonSize("");
    setCartonFactorLoading(true);
    setNotice(null);
    fetch(`/api/wms/items/${encodeURIComponent(selected.item_code)}`, { headers: authHeaders() })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Unable to load the item's ERPNext UOM conversion.");
        const factor = Number(payload.data?.cartonConversionFactor);
        if (live) setCartonSize(Number.isFinite(factor) && factor > 0 ? String(factor) : "1");
      })
      .catch((error) => {
        if (live) {
          setCartonSize("");
          setNotice({ error: true, message: error.message || "Unable to load the item's ERPNext UOM conversion." });
        }
      })
      .finally(() => { if (live) setCartonFactorLoading(false); });
    return () => { live = false; };
  }, [selected]);
  async function createBatch(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/wms/barcode-master", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ itemCode: selected.item_code, totalQuantity, expiryDate }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to generate carton barcodes.");
      setNotice({ message: payload.message });
      setTotalQuantity(""); setSelected(null); setItemSearch("");
      setRecords(payload.data || []);
      window.setTimeout(() => {
        window.print();
        setSearch("");
        loadRecords("").catch((error) => setNotice({ error: true, message: error.message }));
      }, 300);
    } catch (error) { setNotice({ error: true, message: error.message }); }
    finally { setBusy(false); }
  }

  async function updateExpiry(record) {
    const next = window.prompt("Expiry date (YYYY-MM-DD). Leave empty to clear it.", record.expiryDate ? new Date(record.expiryDate).toISOString().slice(0, 10) : "");
    if (next === null) return;
    try {
      const response = await fetch(`/api/wms/barcode-master/${record._id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ expiryDate: next }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to update the expiry date.");
      setNotice({ message: payload.message }); await loadRecords();
    } catch (error) { setNotice({ error: true, message: error.message }); }
  }

  async function regenerate(record) {
    try {
      const response = await fetch(`/api/wms/barcode-master/${record._id}`, { method: "POST", headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to regenerate the barcode.");
      setNotice({ message: payload.message }); await loadRecords();
    } catch (error) { setNotice({ error: true, message: error.message }); }
  }

  async function finalizeScannedStatus(record) {
    try {
      const response = await fetch(`/api/wms/barcode-master/${record._id}/scan`, { method: "PATCH", headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to update the scan status.");
      setNotice({ message: payload.message }); await loadRecords();
    } catch (error) { setNotice({ error: true, message: error.message }); }
  }

  return <div className="space-y-6">
    <style jsx global>{`@media print { body * { visibility: hidden !important; } #barcode-print-area, #barcode-print-area * { visibility: visible !important; } #barcode-print-area { position: absolute; inset: 0 auto auto 0; width: 100%; } .barcode-actions, .barcode-obsolete { display: none !important; } .barcode-label-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8mm; } .barcode-label { break-inside: avoid; border: 1px solid #aaa; padding: 8px; } }`}</style>
    <header className="flex flex-col gap-1 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-4 text-white shadow-xl md:flex-row md:items-center md:gap-5 md:px-8 md:py-5">
      <h1 className="shrink-0 text-3xl font-bold">Barcode Master</h1>
      <div aria-hidden="true" className="barcode-scanner-track relative mt-1 h-16 min-w-0 flex-1 overflow-hidden md:mt-0">
        <div className="barcode-scanner-moving absolute inset-y-0 w-[210px] max-w-[70vw]">
          <Image src="/images/barcode-scanner-object.png" alt="" fill sizes="210px" className="object-contain" />
        </div>
      </div>
    </header>
    {notice ? <div role={notice.error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${notice.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}
    <form onSubmit={createBatch} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <h2 className="text-lg font-bold">Generate carton barcodes</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-2 text-sm font-semibold text-slate-700 xl:col-span-2">Item
          <input value={selected ? `${selected.item_code} · ${selected.item_name}` : itemSearch} onChange={(event) => { setSelected(null); setItemSearch(event.target.value); }} placeholder="Search item code or name" className={fieldClass} />
          {!selected && items.length ? <span className="max-h-40 overflow-auto rounded-xl border border-slate-200">{items.map((item) => <button type="button" key={item.item_code} onClick={() => { setSelected(item); setItemSearch(""); }} className="block w-full border-b border-slate-100 p-2 text-left text-sm hover:bg-cyan-50">{item.item_code} · {item.item_name} <span className="text-slate-500">({item.stock_uom})</span></button>)}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Total pieces ({selected?.stock_uom || "stock unit"})<input required type="number" min="1" step="1" value={totalQuantity} onChange={(event) => setTotalQuantity(event.target.value)} placeholder="e.g. 400" className={fieldClass} /></label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">Pieces per master carton<input readOnly type="number" min="1" value={totalQuantity && cartonSize ? String(Number(totalQuantity) * Number(cartonSize)) : cartonSize} placeholder={cartonFactorLoading ? "Loading from ERPNext..." : "1"} className={`${fieldClass} bg-slate-50`} /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Product expiry date<input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className={fieldClass} /></label>
      </div>
      <button disabled={busy || !selected || !cartonSize || cartonFactorLoading} className="mt-5 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "Generating and saving..." : "Generate, save & print labels"}</button>
    </form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <div className="barcode-actions flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Saved barcode records</h2><p className="mt-1 text-sm text-slate-500">{records.length} records shown · scan status and last update are saved per barcode</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, item, status" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><button onClick={() => window.print()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Print visible labels</button></div></div>
      <div id="barcode-print-area" className="mt-5 barcode-label-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">{records.map((record) => <article key={record._id} className={`barcode-label rounded-xl border border-slate-200 p-4 ${record.status === "Regenerated" ? "barcode-obsolete" : ""}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{record.itemName}</p><p className="text-xs text-slate-500">{record.itemCode} · {record.uom || "Master Carton"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusFor(record) === "Expired" ? "bg-rose-100 text-rose-700" : statusFor(record) === "Scanned" ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"}`}>{statusFor(record)}</span></div>
        <p className="text-xs text-slate-500">Product expiry: {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : "Not set"}</p><p className="text-xs text-slate-500">Barcode valid until: {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : "No expiry set"}</p>
        <div className="mt-2 w-full"><WmsBarcode value={record.barcodeValue} height={48} width={1.5} displayValue={false} className="block h-auto w-full" /></div>
        <p className="w-full break-all text-center font-mono text-xs text-slate-700">{record.barcodeValue}</p>
        {record.scannedAt ? <p className="mt-1 text-[10px] text-slate-500">Scanned: {new Date(record.scannedAt).toLocaleString()}</p> : null}
        <div className="barcode-actions mt-3 flex gap-2">{record.status === "Receiving" ? <button onClick={() => finalizeScannedStatus(record)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800">Finalize scanned status</button> : null}<button disabled={record.status === "Receiving" || record.status === "Regenerated"} onClick={() => updateExpiry(record)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Update expiry</button><button disabled={!(["Generated", "Updated"].includes(record.status))} onClick={() => regenerate(record)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Regenerate</button></div>
      </article>)}</div>{!records.length ? <p className="py-8 text-center text-sm text-slate-500">No barcode records yet. Generate your first batch above.</p> : null}
    </section>
  </div>;
}
