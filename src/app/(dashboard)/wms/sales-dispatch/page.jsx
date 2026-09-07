"use client";

import { useCallback, useEffect, useState } from "react";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const remainingQty = (item) => Math.max(0, Number(item.qty || 0) - Number(item.delivered_qty || 0));

export default function WmsSalesDispatchPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true); setNotice(null);
      const response = await fetch(`/api/wms/sales-orders?${new URLSearchParams({ pageSize: "100", search })}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load Sales Orders.");
      setOrders(payload.data?.records || []);
    } catch (error) { setNotice({ tone: "error", message: error.message }); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const timer = setTimeout(loadOrders, search ? 300 : 0); return () => clearTimeout(timer); }, [loadOrders, search]);

  async function selectOrder(name) {
    try {
      setLoadingOrder(true); setNotice(null); setOrder(null);
      const response = await fetch(`/api/wms/sales-orders/${encodeURIComponent(name)}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load Sales Order.");
      setOrder(payload.data);
      setLines((payload.data.items || []).map((item) => ({ salesOrderItem: item.name, checked: remainingQty(item) > 0, qty: remainingQty(item) || "" })));
    } catch (error) { setNotice({ tone: "error", message: error.message }); }
    finally { setLoadingOrder(false); }
  }

  function updateLine(index, update) { setLines((all) => all.map((line, i) => i === index ? { ...line, ...update } : line)); }

  async function stockOut() {
    try {
      setSubmitting(true); setNotice(null);
      const response = await fetch("/api/wms/sales-dispatch/stock-out", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ salesOrder: order.name, lines: lines.filter((line) => line.checked).map(({ salesOrderItem, qty }) => ({ salesOrderItem, qty })) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to create Stock Out.");
      await selectOrder(order.name);
      setNotice({ tone: "success", message: payload.message });
      loadOrders();
    } catch (error) { setNotice({ tone: "error", message: error.message }); }
    finally { setSubmitting(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
  const submitted = Number(order?.docstatus) === 1;
  return <div className="space-y-6">
    <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ERPNext warehouse transaction</p><h1 className="mt-2 text-3xl font-bold">Sales Dispatch · Stock Out</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Select a Sales Order and quantities to create a submitted ERPNext Delivery Note. Stock is reduced from the Sales Order warehouse.</p></section>
    {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">Select Sales Order</h2><p className="mt-1 text-sm text-slate-500">Shows Draft, On Hold, To Deliver, and To Deliver and Bill orders.</p></div><button onClick={loadOrders} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Refresh</button></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sales order or customer" className={`mt-4 ${inputClass}`} />
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading Sales Orders...</p> : <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">{orders.map((item) => <button type="button" key={item.name} onClick={() => selectOrder(item.name)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-left hover:bg-cyan-50"><span className="min-w-0"><b className="block text-slate-900">{item.name}</b><span className="block truncate text-sm text-slate-500">{item.customer_name || item.customer} · {item.set_warehouse || "Warehouse pending"}</span></span><span className="text-xs font-semibold text-slate-600">{item.status}</span></button>)}{!orders.length ? <p className="p-6 text-center text-sm text-slate-500">No dispatchable Sales Orders found.</p> : null}</div>}</section>
    {loadingOrder ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading Sales Order items...</div> : null}
    {order && !loadingOrder ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">{order.name}</h2><p className="mt-1 text-sm text-slate-500">{order.customer_name || order.customer} · Warehouse: {order.set_warehouse || "Set per item"}</p></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">{order.status}</span></div>{!submitted ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">This is a Draft Sales Order. Submit it in ERPNext before Stock Out is available.</p> : null}<div className="mt-5 overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr><th className="p-3 text-left text-xs">Move</th><th className="p-3 text-left text-xs">Item</th><th className="p-3 text-right text-xs">Undelivered</th><th className="p-3 text-left text-xs">Stock Out Qty</th><th className="p-3 text-left text-xs">Warehouse</th></tr></thead><tbody className="divide-y divide-slate-100">{(order.items || []).map((item, index) => <tr key={item.name}><td className="p-3"><input type="checkbox" checked={Boolean(lines[index]?.checked)} disabled={!remainingQty(item)} onChange={(e) => updateLine(index, { checked: e.target.checked })} /></td><td className="p-3"><b className="text-slate-800">{item.item_name || item.item_code}</b><small className="block text-slate-500">{item.item_code}</small></td><td className="p-3 text-right text-sm">{remainingQty(item)} {item.uom || item.stock_uom}</td><td className="p-3"><input type="number" min="0" max={remainingQty(item)} step="any" disabled={!lines[index]?.checked} value={lines[index]?.qty ?? ""} onChange={(e) => updateLine(index, { qty: e.target.value })} className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100" /></td><td className="p-3 text-sm text-slate-600">{item.warehouse || order.set_warehouse || "-"}</td></tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-sm text-slate-500">Stock Out creates and submits one ERPNext Delivery Note.</p><button type="button" onClick={stockOut} disabled={!submitted || submitting || !lines.some((line) => line.checked && Number(line.qty) > 0)} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating Delivery Note..." : "Stock Out"}</button></div></section> : null}
  </div>;
}
