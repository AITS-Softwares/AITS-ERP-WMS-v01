"use client";

import { useRef, useState } from "react";

export default function WmsScanStockOut({ order, warehouses = [], onComplete, onBusyChange, disabled = false }) {
  const [itemId, setItemId] = useState("");
  const [warehouse, setWarehouse] = useState(order.set_warehouse || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const input = useRef(null);
  const locked = useRef(false);
  const lastScan = useRef({ code: "", at: 0 });
  const available = (order.items || []).filter((item) => Number(item.qty) - Number(item.delivered_qty || 0) >= 1);
  const selected = available.find((item) => item.name === itemId);
  const enabled = Number(order.docstatus) === 1 && selected && warehouse && !disabled;

  async function scan(event) {
    event.preventDefault();
    const value = code.trim();
    if (!enabled || locked.current || !value) return;
    setCode("");
    if (lastScan.current.code === value && Date.now() - lastScan.current.at < 2000) {
      setNotice({ error: true, message: "Duplicate scan ignored. Wait two seconds before scanning again." });
      return;
    }
    locked.current = true;
    lastScan.current = { code: value, at: Date.now() };
    setBusy(true); onBusyChange?.(true); setNotice(null);
    let completed = false;
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
      const lookup = await fetch(`/api/wms/barcode-lookup?code=${encodeURIComponent(value)}`, { headers });
      const barcode = await lookup.json().catch(() => ({}));
      if (!lookup.ok) throw new Error(barcode.message || "Barcode was not recognized.");
      if (barcode.data.itemCode !== selected.item_code) throw new Error(`Scanned carton is ${barcode.data.itemCode}, but ${selected.item_code} is selected.`);
      const qty = Number(barcode.data.conversionFactor || 1) / (Number(selected.conversion_factor || 1) || 1);
      const remaining = Math.max(0, Number(selected.qty) - Number(selected.delivered_qty || 0));
      if (qty > remaining) throw new Error(`This carton contains ${barcode.data.conversionFactor} ${barcode.data.stockUom}; only ${remaining} ${selected.uom || "units"} remain on the Sales Order.`);
      const response = await fetch("/api/wms/sales-dispatch/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ salesOrder: order.name, lines: [{ salesOrderItem: selected.name, qty, warehouse }] }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data?.name) throw new Error(payload.message || "Stock-out result could not be confirmed.");
      completed = true;
      setNotice({ message: `Scanned ${barcode.data.uom} carton (${barcode.data.conversionFactor} ${barcode.data.stockUom}) and stocked it out. Delivery Note: ${payload.data.name}.` });
      await onComplete();
    } catch (error) {
      setItemId("");
      setNotice({ error: true, message: completed ? "Stock out succeeded, but refreshing failed. Reload before scanning again." : error.message });
    } finally {
      setBusy(false); onBusyChange?.(false); setCode(""); locked.current = false;
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  return <section className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
    <h2 className="font-bold text-slate-950">Scan carton to stock out</h2>
    <p className="text-sm text-slate-600">Select an item and warehouse, then scan its carton barcode. Each scan submits a Delivery Note for the carton’s converted quantity.</p>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block text-sm font-semibold">Item to stock out<select value={itemId} disabled={busy || disabled || Number(order.docstatus) !== 1} onChange={(event) => { setItemId(event.target.value); setNotice(null); setCode(""); requestAnimationFrame(() => input.current?.focus()); }} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50"><option value="">Select an item</option>{available.map((item) => <option key={item.name} value={item.name}>{item.item_code} · {item.item_name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Source warehouse<select value={warehouse} disabled={busy || disabled} onChange={(event) => setWarehouse(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50"><option value="">Select a warehouse</option>{warehouses.map((row) => <option key={row.name} value={row.name}>{row.warehouse_name || row.name}</option>)}</select></label>
    </div>
    <form onSubmit={scan}><label htmlFor="stock-out-scan" className="block text-sm font-semibold">Carton barcode</label><input ref={input} id="stock-out-scan" autoComplete="off" value={code} readOnly={busy} disabled={!enabled} onChange={(event) => { if (!locked.current) setCode(event.target.value); }} placeholder={busy ? "Submitting stock out…" : "Scan carton barcode (scanner sends Enter)"} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50" /></form>
    {Number(order.docstatus) !== 1 ? <p className="text-sm text-amber-700">Submit this Sales Order to enable scan-to-stock-out.</p> : null}
    {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl bg-white p-3 text-sm ${notice.error ? "text-rose-700" : "text-emerald-800"}`}>{notice.message}</p> : null}
  </section>;
}
