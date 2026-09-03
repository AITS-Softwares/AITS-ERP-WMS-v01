"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WmsBarcode from "@/components/wms/WmsBarcode";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

const MASTER_CARTON_UOM = "Master Carton";

export default function WmsCartonSetup() {
  const router = useRouter();
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [conversionFactor, setConversionFactor] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ pageSize: "10", search: itemSearch });
      fetch(`/api/wms/items?${query}`, { headers: authHeaders() }).then((r) => r.json()).then((p) => setItemResults(p.data?.records || [])).catch(() => {});
    }, itemSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  async function loadSetup(code) {
    setLoading(true); setNotice(null); setSetup(null);
    try {
      const response = await fetch(`/api/wms/items/${encodeURIComponent(code)}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load this item.");
      setSetup(payload.data);
      setConversionFactor(payload.data.cartonConversionFactor ? String(payload.data.cartonConversionFactor) : "");
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to load this item." });
    } finally {
      setLoading(false);
    }
  }

  // Selection survives navigation (e.g. going to WMS Setup to flip the barcode
  // toggle and coming back) via a `?item=` query param, not just local state.
  function selectByCode(code) {
    setSelectedCode(code);
    setItemSearch("");
    setItemResults([]);
    loadSetup(code);
    router.replace(`/wms/carton-setup?item=${encodeURIComponent(code)}`, { scroll: false });
  }

  function selectItem(item) { selectByCode(item.item_code); }

  useEffect(() => {
    const preselected = new URLSearchParams(window.location.search).get("item");
    if (preselected) selectByCode(preselected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveConversion() {
    try {
      setSaving(true); setNotice(null);
      const response = await fetch(`/api/wms/items/${encodeURIComponent(selectedCode)}/carton`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ conversionFactor }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to save the Master Carton conversion.");
      setSetup(payload.data);
      setNotice({ tone: "success", message: payload.message });
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to save the Master Carton conversion." });
    } finally {
      setSaving(false);
    }
  }

  async function generateBarcode() {
    try {
      setGenerating(true); setNotice(null);
      const response = await fetch(`/api/wms/items/${encodeURIComponent(selectedCode)}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ uom: MASTER_CARTON_UOM }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to generate a barcode.");
      await loadSetup(selectedCode);
      setNotice({ tone: "success", message: payload.message });
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to generate a barcode." });
    } finally {
      setGenerating(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
  const cartonBarcode = setup?.barcodes?.find((row) => row.uom === MASTER_CARTON_UOM);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Phase 3 · Barcode &amp; Master Carton</p>
        <h1 className="mt-2 text-3xl font-bold">Item &amp; Carton Setup</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Defines each item's Master Carton UOM and conversion factor, and registers its barcode directly on ERPNext's Item — standard Item UOM and Item Barcode tables, nothing custom.</p>
      </section>
      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-bold">Find an item</h2>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search item code or item name" className={inputClass} />
          {itemResults.length ? (
            <div className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl bg-white">
              {itemResults.map((item) => (
                <button type="button" key={item.item_code} onClick={() => selectItem(item)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-left hover:bg-cyan-50">
                  <span><span className="block truncate text-sm font-semibold text-slate-900">{item.item_name}</span><span className="block truncate text-xs text-slate-500">{item.item_code} · {item.stock_uom || "UOM pending"}</span></span>
                  <span className="text-xs font-semibold text-cyan-700">Select</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading item...</div> : null}

      {setup && !loading ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-bold">{setup.itemName}</h2>
            <p className="text-sm text-slate-500">{setup.itemCode} · Base UOM: {setup.stockUom}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Master Carton conversion factor (1 Master Carton = this many {setup.stockUom})
                <input type="number" min="0.0001" step="0.0001" className={inputClass} value={conversionFactor} onChange={(event) => setConversionFactor(event.target.value)} placeholder="e.g. 24" />
              </label>
              <button type="button" disabled={saving || !(Number(conversionFactor) > 0)} onClick={saveConversion} className="self-end rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save conversion"}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-bold">Master Carton barcode</h2>
              <button type="button" disabled={generating || !setup.cartonConversionFactor} onClick={generateBarcode} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">{generating ? "Loading..." : cartonBarcode ? "Refresh barcode" : "Generate barcode"}</button>
            </div>
            {!setup.cartonConversionFactor ? <p className="mt-2 text-xs text-slate-500">Save a conversion factor above before registering a Master Carton barcode.</p> : null}
            {cartonBarcode ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 print:border-none">
                <p className="text-sm font-semibold text-slate-900">{setup.itemName}</p>
                <p className="text-xs text-slate-500">{setup.itemCode} · 1 carton = {setup.cartonConversionFactor} {setup.stockUom}</p>
                <div className="mt-3"><WmsBarcode value={cartonBarcode.barcode} /></div>
                <button type="button" onClick={() => window.print()} className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 print:hidden">Print label</button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
