"use client";

import { useEffect, useState } from "react";
import WmsSelect from "@/components/wms/WmsSelect";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export default function WmsBinLocations() {
  const [warehouses, setWarehouses] = useState([]), [bins, setBins] = useState([]), [form, setForm] = useState({ company: "", parentWarehouse: "", warehouseName: "", locationType: "bin" }), [notice, setNotice] = useState(null), [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [warehouseResponse, binResponse] = await Promise.all([fetch("/api/wms/warehouses?pageSize=100", { headers: authHeaders() }), fetch(`/api/wms/bin-locations?company=${encodeURIComponent(form.company)}`, { headers: authHeaders() })]);
      const warehousePayload = await warehouseResponse.json(), binPayload = await binResponse.json();
      if (!warehouseResponse.ok) throw new Error(warehousePayload.message || "Unable to load warehouses.");
      if (!binResponse.ok) throw new Error(binPayload.message || "Unable to load bin locations.");
      setWarehouses(warehousePayload.data?.records || []); setBins(binPayload.data || []);
    } catch (error) { setNotice({ error: true, message: error.message }); }
  };
  useEffect(() => { load(); }, []);
  const companyOptions = [...new Map(warehouses.map((warehouse) => [warehouse.company, warehouse.company])).values()].filter(Boolean).map((value) => ({ value, label: value }));
  const parentOptions = warehouses.filter((warehouse) => Number(warehouse.is_group) === 1 && (!form.company || warehouse.company === form.company)).map((warehouse) => ({ value: warehouse.name, label: warehouse.warehouse_name || warehouse.name }));
  async function create(event) {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/wms/bin-locations", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ ...form, isGroup: form.locationType !== "bin" }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.message || "Unable to create bin.");
      setNotice({ message: payload.message }); setForm((current) => ({ ...current, warehouseName: "" })); await load();
    } catch (error) { setNotice({ error: true, message: error.message }); } finally { setSaving(false); }
  }
  return <div className="space-y-6"><section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ERPNext physical locations</p><h1 className="mt-2 text-3xl font-bold">Bin Locations</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Create the structure Company → Warehouse → Shelf → Rack → Bin. Only the final bin holds stock and can be selected during receipt or dispatch.</p></section>
    {notice ? <p className={`rounded-xl border p-3 text-sm ${notice.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</p> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Create location</h2><form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-5"><label className="grid gap-1 text-sm font-semibold">Company<WmsSelect value={form.company} onChange={(company) => setForm({ ...form, company, parentWarehouse: "" })} options={companyOptions} placeholder="Select company" /></label><label className="grid gap-1 text-sm font-semibold">Parent location<WmsSelect value={form.parentWarehouse} onChange={(parentWarehouse) => setForm({ ...form, parentWarehouse })} options={parentOptions} placeholder="Warehouse, shelf, or rack" /></label><label className="grid gap-1 text-sm font-semibold">Location type<select value={form.locationType} onChange={(event) => setForm({ ...form, locationType: event.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="shelf">Shelf</option><option value="rack">Rack</option><option value="bin">Bin</option></select></label><label className="grid gap-1 text-sm font-semibold">Location name<input required value={form.warehouseName} onChange={(event) => setForm({ ...form, warehouseName: event.target.value })} placeholder={form.locationType === "bin" ? "Bin 1" : form.locationType === "rack" ? "Rack A" : "Shelf 01"} className="rounded-xl border border-slate-300 px-3 py-2.5" /></label><button disabled={saving} className="self-end rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating..." : `Create ${form.locationType}`}</button></form></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Bin-wise stock</h2><p className="mt-1 text-sm text-slate-500">Live totals from ERPNext Bin balances.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="p-3">Bin</th><th className="p-3">Parent store</th><th className="p-3 text-right">Available</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Items</th></tr></thead><tbody>{bins.map((bin) => <tr key={bin.name} className="border-t border-slate-100"><td className="p-3 font-semibold">{bin.warehouse_name || bin.name}</td><td className="p-3 text-slate-600">{bin.parent_warehouse || "-"}</td><td className="p-3 text-right">{bin.actualQty}</td><td className="p-3 text-right">{bin.reservedQty}</td><td className="p-3 text-right">{bin.itemCount}</td></tr>)}{!bins.length ? <tr><td colSpan="5" className="p-8 text-center text-slate-500">No leaf-bin locations found. Create a bin under a store.</td></tr> : null}</tbody></table></div></section></div>;
}
