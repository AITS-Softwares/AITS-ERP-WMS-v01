"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WmsBarcode from "@/components/wms/WmsBarcode";
import { FiBox, FiPackage } from "react-icons/fi";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl ${tone}`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default function WmsCartonSetup() {
  const router = useRouter();
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const [itemHasMore, setItemHasMore] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [selectedUom, setSelectedUom] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [totalItems, setTotalItems] = useState(null);

  // Search results dropdown — 25 per page, with Next/Previous.
  // IMPORTANT: only include "search" in the query when it's non-empty,
  // so an empty search box behaves identically to the "Total Items" fetch
  // below (which never sends "search" at all). This avoids the backend
  // treating search="" differently from no search param.
  useEffect(() => {
    setSearchingItems(true);
    const timer = setTimeout(() => {
      const params = { page: String(itemPage), pageSize: "25" };
      if (itemSearch.trim()) params.search = itemSearch.trim();
      const query = new URLSearchParams(params);
      fetch(`/api/wms/items?${query}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((p) => {
          setItemResults(p.data?.records || []);
          setItemHasMore(Boolean(p.data?.hasMore));
        })
        .catch(() => { setItemResults([]); setItemHasMore(false); })
        .finally(() => setSearchingItems(false));
    }, itemSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [itemSearch, itemPage]);

  // Reset to page 1 whenever the search term changes
  function updateSearch(value) {
    setItemSearch(value);
    setItemPage(1);
  }

  // Total Items stat — count every ERPNext page, not just the first 100 items.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let page = 1;
        let total = 0;
        while (page <= 500) {
          const response = await fetch(`/api/wms/items?${new URLSearchParams({ page: String(page), pageSize: "100" })}`, { headers: authHeaders() });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.message || "Unable to count items.");
          const records = payload.data?.records || [];
          total += records.length;
          if (!payload.data?.hasMore || !records.length) break;
          page += 1;
        }
        if (!cancelled) setTotalItems(total);
      } catch { if (!cancelled) setTotalItems(null); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadSetup(code) {
    setLoading(true); setNotice(null); setSetup(null);
    try {
      const response = await fetch(`/api/wms/items/${encodeURIComponent(code)}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load this item.");
      setSetup(payload.data);
      setSelectedUom(payload.data.stockUom || "");
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to load this item." });
    } finally {
      setLoading(false);
    }
  }

  function selectByCode(code) {
    setSelectedCode(code);
    setItemSearch("");
    setItemPage(1);
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

  async function generateBarcode() {
    try {
      setGenerating(true); setNotice(null);
      const response = await fetch(`/api/wms/items/${encodeURIComponent(selectedCode)}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ uom: selectedUom }),
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
  const selectedConversionFactor = selectedUom === setup?.stockUom
    ? 1
    : (setup?.uoms || []).find((row) => row.uom === selectedUom)?.conversionFactor;
  const selectedUomBarcode = setup?.barcodes?.find((row) => row.uom === selectedUom);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Phase 3 · Barcode &amp; Master Carton</p>
          <h1 className="mt-2 text-3xl font-bold">Item &amp; Carton Setup</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Shows Item UOMs and conversion factors from ERPNext. Select a UOM to generate and display its own barcode.</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Items" value={totalItems ?? "-"} icon={FiBox} tone="bg-cyan-500" />
        <StatCard label="Selected Item" value={setup ? setup.itemCode : "-"} icon={FiPackage} tone="bg-violet-500" />
        <StatCard label="Selected Conversion" value={setup ? `${selectedConversionFactor ?? "-"} ${setup.stockUom}` : "-"} icon={FiPackage} tone="bg-emerald-500" />
      </div>

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-bold">Find an item</h2>
        <p className="mt-1 text-xs text-slate-500">
          {itemSearch ? `Showing matches for "${itemSearch}" · Page ${itemPage}` : `Page ${itemPage} of ${totalItems ?? "?"} items. Type to search.`}
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <input value={itemSearch} onChange={(event) => updateSearch(event.target.value)} placeholder="Search item code or item name" className={inputClass} />

          {searchingItems ? (
            <p className="mt-2 px-1 py-2 text-xs text-slate-500">Searching...</p>
          ) : itemResults.length ? (
            <>
              <div className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl bg-white">
                {itemResults.map((item) => (
                  <button type="button" key={item.item_code} onClick={() => selectItem(item)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-left transition hover:bg-cyan-50">
                    <span><span className="block truncate text-sm font-semibold text-slate-900">{item.item_name}</span><span className="block truncate text-xs text-slate-500">{item.item_code} · {item.stock_uom || "UOM pending"}</span></span>
                    <span className="text-xs font-semibold text-cyan-700">Select</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  disabled={itemPage === 1}
                  onClick={() => setItemPage((value) => value - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">Page {itemPage}</span>
                <button
                  type="button"
                  disabled={!itemHasMore}
                  onClick={() => setItemPage((value) => value + 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 px-1 py-2 text-xs text-slate-500">No items found.</p>
          )}
        </div>
      </section>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading item...</div> : null}

      {setup && !loading ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-bold">{setup.itemName} · Units of Measure</h2>
            <p className="mt-1 text-sm text-slate-500">Available UOMs are read directly from this Item in ERPNext.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Select UOM
                <select value={selectedUom} onChange={(event) => setSelectedUom(event.target.value)} className={inputClass}>
                  <option value={setup.stockUom}>{setup.stockUom} (Base UOM)</option>
                  {(setup.uoms || []).filter((row) => row.uom !== setup.stockUom).map((row) => <option key={row.uom} value={row.uom}>{row.uom}</option>)}
                </select>
              </label>
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected UOM</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUom || "-"}</p>
                <p className="mt-1 text-xs text-slate-500">1 {selectedUom || "UOM"} = {selectedConversionFactor ?? "-"} {setup.stockUom}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><h2 className="text-lg font-bold">{selectedUom || "Selected UOM"} barcode</h2><p className="mt-1 text-xs text-slate-500">Barcode automatically follows the UOM selected above.</p></div>
              <button type="button" disabled={generating || !selectedUom || !(Number(selectedConversionFactor) > 0)} onClick={generateBarcode} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition disabled:opacity-50">{generating ? "Loading..." : selectedUomBarcode ? "Refresh barcode" : "Generate barcode"}</button>
            </div>
            {!selectedUom || !(Number(selectedConversionFactor) > 0) ? <p className="mt-2 text-xs text-slate-500">Select a valid ERPNext UOM with a conversion factor before registering a barcode.</p> : null}
            {selectedUomBarcode ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 print:border-none">
                <p className="text-sm font-semibold text-slate-900">{setup.itemName}</p>
                <p className="text-xs text-slate-500">{setup.itemCode} · 1 {selectedUom} = {selectedConversionFactor} {setup.stockUom}</p>
                <div className="mt-3"><WmsBarcode value={selectedUomBarcode.barcode} /></div>
                <button type="button" onClick={() => window.print()} className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 print:hidden">Print label</button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
