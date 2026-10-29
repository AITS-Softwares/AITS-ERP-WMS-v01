"use client";

import { useRef, useState } from "react";
import { findScannedLocation } from "@/lib/wmsLocationQr";

export default function WmsScanStockOut({ order, locations, onComplete, onBusyChange, disabled = false }) {
  const [itemId, setItemId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const input = useRef(null);
  const locked = useRef(false);
  const lastScan = useRef({ code: "", at: 0 });
  const available = (order.items || []).filter((item) => Number(item.qty) - Number(item.delivered_qty || 0) >= 1);
  const selected = available.find((item) => item.name === itemId);
  const enabled = Number(order.docstatus) === 1 && selected && !disabled;

  async function scan(event) {
    event.preventDefault();
    const value = code.trim();
    if (!enabled || locked.current || !value) return;
    setCode("");
    if (lastScan.current.code === value && Date.now() - lastScan.current.at < 2000) {
      setNotice({ error: true, message: "Duplicate scan ignored. Wait two seconds before the next unit." });
      return;
    }
    const location = findScannedLocation(locations, value);
    if (!location) {
      setNotice({ error: true, message: "Location not recognized uniquely. Scan the location barcode shown in Bin Master Location." });
      return;
    }
    locked.current = true;
    lastScan.current = { code: value, at: Date.now() };
    setBusy(true);
    onBusyChange?.(true);
    setNotice(null);
    let completed = false;
    try {
      const response = await fetch("/api/wms/sales-dispatch/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ salesOrder: order.name, lines: [{ salesOrderItem: selected.name, qty: 1, physicalLocation: location.name }] }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data?.name) throw new Error(payload.message || "Stock-out result could not be confirmed.");
      completed = true;
      setNotice({
        message: `Stocked out 1 ${selected.uom || selected.stock_uom || "unit"} of ${selected.item_code}. Delivery Note: ${payload.data.name}.`,
        location,
      });
      await onComplete();
    } catch (error) {
      setItemId("");
      setNotice({ error: true, message: completed ? "Stock out succeeded, but refreshing failed. Reload before scanning again." : `${error.message} Check Delivery Notes before selecting the item and scanning again.` });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      // Keep the scanner locked during refresh, and discard buffered input.
      setCode("");
      locked.current = false;
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  return <section className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
    <h2 className="font-bold text-slate-950">Scan to stock out one unit</h2>
    <p className="text-sm text-slate-600">Select an item, then scan its source location. Each scan immediately submits a Delivery Note for 1 unit in the item’s order UOM.</p>
    <label className="block text-sm font-semibold">Item to stock out
      <select value={itemId} disabled={busy || disabled || Number(order.docstatus) !== 1} onChange={(event) => { setItemId(event.target.value); setNotice(null); setCode(""); requestAnimationFrame(() => input.current?.focus()); }} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50">
        <option value="">Select an item to enable scanning</option>
        {available.map((item) => <option key={item.name} value={item.name}>{item.item_code} · {item.item_name} · 1 {item.uom || item.stock_uom} per scan</option>)}
      </select>
    </label>
    <form onSubmit={scan}>
      <label htmlFor="stock-out-scan" className="block text-sm font-semibold">Source location barcode</label>
      <input ref={input} id="stock-out-scan" autoComplete="off" value={code} readOnly={busy} disabled={!enabled} onChange={(event) => { if (!locked.current) setCode(event.target.value); }} placeholder={busy ? "Submitting stock out…" : "Scan location here (scanner must send Enter)"} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50" />
    </form>
    {Number(order.docstatus) !== 1 ? <p className="text-sm text-amber-700">Submit this Sales Order to enable scan-to-stock-out.</p> : null}
    {notice ? <div role={notice.error ? "alert" : "status"} className={`rounded-xl bg-white p-3 text-sm ${notice.error ? "text-rose-700" : "text-emerald-800"}`}>
      <p>{notice.message}</p>
      {notice.location ? <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
        {[["Warehouse", notice.location.warehouseName || notice.location.warehouse], ["Rack", notice.location.rack], ["Shelf", notice.location.shelf], ["Bin", notice.location.bin]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value || "Not assigned"}</dd></div>)}
      </dl> : null}
    </div> : null}
  </section>;
}
