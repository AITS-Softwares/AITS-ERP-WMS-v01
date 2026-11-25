"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WmsSelect from "@/components/wms/WmsSelect";
import WmsBarcodeScanner from "@/components/wms/WmsBarcodeScanner";
import { isWmsBarcodeUiEnabled } from "@/components/wms/wmsBarcodePreference";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

export default function WmsGrnForm() {
  const router = useRouter();
  const [openOrders, setOpenOrders] = useState([]);
  const [poName, setPoName] = useState("");
  const [po, setPo] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState("");
  const [lines, setLines] = useState([]);
  const [loadingPo, setLoadingPo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [barcodeUiEnabled, setBarcodeUiEnabled] = useState(true);

  useEffect(() => {
    const preselected = new URLSearchParams(window.location.search).get("po");
    if (preselected) setPoName(preselected);
    setBarcodeUiEnabled(isWmsBarcodeUiEnabled());
  }, []);

  useEffect(() => {
    fetch("/api/wms/purchase-orders?status=open", { headers: authHeaders() }).then((r) => r.json()).then((p) => setOpenOrders(p.data?.records || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!poName) { setPo(null); setLines([]); setWarehouses([]); return; }
    setLoadingPo(true); setNotice(null);
    fetch(`/api/wms/purchase-orders/${encodeURIComponent(poName)}`, { headers: authHeaders() })
      .then((r) => r.json().then((payload) => ({ ok: r.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.message || "Unable to load this Purchase Order.");
        const doc = payload.data;
        setPo(doc);
        setWarehouse(doc.set_warehouse || "");
        setLines((doc.items || []).map((row) => {
          const pending = Math.max(0, Number(row.qty || 0) - Number(row.received_qty || 0));
          return { poItemName: row.name, itemCode: row.item_code, itemName: row.item_name, uom: row.uom, conversionFactor: Number(row.conversion_factor || 1), ordered: row.qty, received: row.received_qty || 0, pending, receivedQty: 0, rejectedQty: 0, batchNo: "" };
        }));
        // Warehouses belong to one ERPNext Company — scope the list to the PO's Company.
        const query = new URLSearchParams({ pageSize: "100", company: doc.company || "" });
        return fetch(`/api/wms/warehouses?${query}`, { headers: authHeaders() }).then((r) => r.json()).then((warehousePayload) => setWarehouses(warehousePayload.data?.records || []));
      })
      .catch((error) => {
        setNotice({ tone: "error", message: error.message || "Unable to load this Purchase Order." });
        setPo(null); setLines([]); setWarehouses([]);
      })
      .finally(() => setLoadingPo(false));
  }, [poName]);

  function updateLine(poItemName, patch) { setLines((current) => current.map((line) => (line.poItemName === poItemName ? { ...line, ...patch } : line))); }

  // Each successful scan adds one carton's worth (the resolved UOM's
  // conversion factor) to that line's received qty — mirrors physically
  // scanning cartons off a pallet as they're unloaded.
  async function handleScan(resolved) {
    if (resolved.alreadyScanned) {
      setNotice({ tone: "error", message: `This carton barcode was already scanned${resolved.scannedAt ? ` at ${new Date(resolved.scannedAt).toLocaleString()}` : ""}.` });
      return;
    }
    const match = lines.find((line) => line.itemCode === resolved.itemCode);
    if (!match) {
      setNotice({ tone: "error", message: `${resolved.itemName} is not part of this Purchase Order.` });
      return;
    }
    const stockQty = Number(resolved.conversionFactor) > 0 ? Number(resolved.conversionFactor) : 1;
    const increment = stockQty / (Number(match.conversionFactor || 1) || 1);
    if (!warehouse) {
      setNotice({ tone: "error", message: "Select the receiving warehouse before scanning a carton." });
      return;
    }
    if (increment > Number(match.pending || 0)) {
      setNotice({ tone: "error", message: `This carton contains ${stockQty} ${resolved.stockUom}, but only ${match.pending} ${match.uom} remain on the Purchase Order.` });
      return;
    }

    let reserved = false;
    let receiptName = "";
    try {
      if (resolved.barcodeMasterId) {
        const reserveResponse = await fetch(`/api/wms/barcode-master/${encodeURIComponent(resolved.barcodeMasterId)}/scan`, { method: "POST", headers: authHeaders() });
        const reservePayload = await reserveResponse.json().catch(() => ({}));
        if (!reserveResponse.ok) throw new Error(reservePayload.message || "Unable to reserve this barcode.");
        reserved = true;
      }
      const receiptResponse = await fetch("/api/wms/purchase-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ purchaseOrder: poName, warehouse, lines: [{ poItemName: match.poItemName, receivedQty: increment, rejectedQty: 0, batchNo: match.batchNo }] }),
      });
      const receiptPayload = await receiptResponse.json().catch(() => ({}));
      if (!receiptResponse.ok) throw new Error(receiptPayload.message || "ERPNext could not post this stock receipt.");
      receiptName = receiptPayload.data?.name || "submitted Purchase Receipt";
      updateLine(match.poItemName, { receivedQty: 0, received: Number(match.received || 0) + increment, pending: Math.max(0, Number(match.pending || 0) - increment) });
      if (reserved) {
        const statusResponse = await fetch(`/api/wms/barcode-master/${encodeURIComponent(resolved.barcodeMasterId)}/scan`, { method: "PATCH", headers: authHeaders() });
        const statusPayload = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(statusPayload.message || "Stock was posted, but barcode status could not be updated.");
      }
      setNotice({ tone: "success", message: `Carton scanned and ${increment} ${match.uom} (${stockQty} ${resolved.stockUom}) stocked into ${warehouse}. Purchase Receipt: ${receiptName}.` });
    } catch (error) {
      if (reserved && !receiptName) await fetch(`/api/wms/barcode-master/${encodeURIComponent(resolved.barcodeMasterId)}/scan`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
      if (receiptName) {
        setNotice({ tone: "error", message: `Stock was posted in Purchase Receipt ${receiptName}, but the barcode status update needs attention: ${error.message}` });
      } else {
        setNotice({ tone: "error", message: error.message || "Unable to stock in this carton." });
      }
    }
  }

  const activeLines = lines.filter((line) => Number(line.receivedQty) > 0);
  const canSave = Boolean(poName) && activeLines.length > 0 && Boolean(warehouse);

  async function confirmGrn() {
    try {
      setSaving(true); setNotice(null);
      const response = await fetch("/api/wms/purchase-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          purchaseOrder: poName,
          warehouse,
          lines: lines.filter((line) => Number(line.receivedQty) > 0).map((line) => ({ poItemName: line.poItemName, receivedQty: line.receivedQty, rejectedQty: line.rejectedQty, batchNo: line.batchNo })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to submit this GRN.");
      router.push(`/wms/grn/${encodeURIComponent(payload.data.name)}`);
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to submit this GRN." });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
  const openOrderOptions = openOrders.map((order) => ({ value: order.name, label: `${order.name} · ${order.supplier_name || order.supplier}` }));
  const warehouseOptions = warehouses.map((row) => ({ value: row.name, label: row.warehouse_name || row.name }));

  return (
    <div className="space-y-6">
      <section className="flex min-h-[72px] items-center rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-3 text-white shadow-lg md:min-h-[80px] md:px-8 md:py-4">
        <h1 className="text-3xl font-bold">Goods Receipt Note</h1>
      </section>
      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-bold">Receive against</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Open Purchase Order
            <WmsSelect value={poName} onChange={setPoName} options={openOrderOptions} placeholder="Search open Purchase Orders..." />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Receiving warehouse
            <WmsSelect value={warehouse} onChange={setWarehouse} options={warehouseOptions} placeholder={po ? "Select warehouse..." : "Select a Purchase Order first"} disabled={!po} />
          </label>
        </div>
        {po ? <p className="mt-4 text-sm text-slate-500">Supplier: <strong className="text-slate-800">{po.supplier_name || po.supplier}</strong> · Status: <strong className="text-slate-800">{po.status}</strong></p> : null}
      </section>

      {loadingPo ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading Purchase Order items...</div> : null}

      {po && !loadingPo ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-lg font-bold">Items</h2>
          {barcodeUiEnabled ? (
            <div className="mt-4">
              <WmsBarcodeScanner onResolve={handleScan} disabled={!warehouse || saving} />
            </div>
          ) : null}
          <div className="mt-4 space-y-4">
            {lines.map((line) => (
              <div key={line.poItemName} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1.4fr_0.6fr_0.6fr_0.9fr_1fr_0.5fr]">
                <div><p className="font-semibold text-slate-900">{line.itemName}</p><p className="text-xs text-slate-500">{line.itemCode} · Ordered {line.ordered} {line.uom} · Received {line.received} · Pending {line.pending}</p></div>
                <label className="grid gap-1 text-xs font-semibold text-slate-500">Received qty<input type="number" min="0" step="0.0001" className={inputClass} value={line.receivedQty} onChange={(event) => updateLine(line.poItemName, { receivedQty: event.target.value })} /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-500">Rejected qty<input type="number" min="0" step="0.0001" className={inputClass} value={line.rejectedQty} onChange={(event) => updateLine(line.poItemName, { rejectedQty: event.target.value })} /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-500">Batch No. (if tracked)<input className={inputClass} value={line.batchNo} onChange={(event) => updateLine(line.poItemName, { batchNo: event.target.value })} /></label>
                <p className="self-center text-xs text-slate-400">{line.uom}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-500">Scanning a valid carton submits a Purchase Receipt immediately and updates its Barcode Master status. Manual quantities can still be entered and posted with Confirm GRN.</p>
            <button type="button" disabled={!canSave || saving} onClick={confirmGrn} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Submitting..." : "Confirm GRN"}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
