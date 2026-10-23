"use client";
import { useEffect, useState } from "react";

const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const titles = { racks: "Rack Master", shelves: "Shelf Master", bins: "Bin Master", locations: "Bin Master Location" };
const initial = () => ({ rack_name: "", shelf_name: "", bin_code: "", rack: "", shelf: "", capacity: "", has_shelf: true, has_bin: true, location: "", warehouse: "", physical_locations: [{ rack: "", shelf: "", bin: "" }] });
export default function WmsLocationMasters({ kind = "locations" }) {
  const [form, setForm] = useState(initial), [masters, setMasters] = useState({ racks: [], shelves: [], bins: [], locations: [] }), [warehouses, setWarehouses] = useState([]), [message, setMessage] = useState(""), [saving, setSaving] = useState(false);
  async function load() {
    const response = await fetch("/api/wms/location-masters", { headers: headers() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to load masters.");
    setMasters(payload.data);
  }
  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    (async () => {
      const records = [];
      for (let page = 1; ; page++) {
        const response = await fetch(`/api/wms/warehouses?pageSize=100&page=${page}`, { headers: headers() });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load warehouses.");
        records.push(...(payload.data?.records || []));
        if (!payload.data?.hasMore) break;
      }
      setWarehouses(records.filter((row) => !Number(row.is_group)));
    })().catch((error) => setMessage(error.message));
  }, []);
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const inputClass = "rounded-lg border border-slate-300 bg-white p-2.5 w-full";
  function select(label, value, records, onChange, required = true) {
    return <label className="grid gap-2 text-sm">{label}<select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">Select {label.toLowerCase()}</option>{records.map((row) => <option key={row.name} value={row.name}>{row.warehouse_name || row.name}</option>)}</select></label>;
  }
  function field(label, name, type = "text") { return <label className="grid gap-2 text-sm">{label}<input required={type !== "number"} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} type={type} value={form[name]} onChange={(event) => change(name, event.target.value)} className={inputClass} /></label>; }
  function updateRow(index, patch) { change("physical_locations", form.physical_locations.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/wms/location-masters", { method: "POST", headers: headers(), body: JSON.stringify({ kind, ...form, capacity: Number(form.capacity || 0), has_shelf: form.has_shelf ? 1 : 0, has_bin: form.has_bin ? 1 : 0 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to save master.");
      setMessage(payload.message); setForm(initial()); await load();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-white to-cyan-50/60 p-5 shadow-lg"><header className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Warehouse Location Masters</p><h2 className="mt-2 text-3xl font-bold">{titles[kind]}</h2><p className="mt-2 text-sm text-slate-300">Create and manage locations in ERPNext.</p></header>{message ? <p role="status" className="rounded-lg bg-slate-100 p-3">{message}</p> : null}<form onSubmit={save} className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{kind === "racks" ? field("Rack name", "rack_name") : null}{kind === "shelves" ? field("Shelf name", "shelf_name") : null}{kind === "bins" ? field("Bin name", "bin_code") : null}{["shelves", "bins"].includes(kind) ? select("Rack", form.rack, masters.racks, (value) => setForm({ ...form, rack: value, shelf: "" })) : null}{kind === "bins" ? select("Shelf", form.shelf, masters.shelves.filter((row) => row.rack === form.rack), (value) => change("shelf", value)) : null}{kind !== "locations" ? field("Capacity", "capacity", "number") : <>{field("Location", "location")}{select("Warehouse", form.warehouse, warehouses, (value) => change("warehouse", value))}</>}{kind === "racks" ? <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_shelf} onChange={(event) => change("has_shelf", event.target.checked)} />Has Shelf</label> : null}{kind === "shelves" ? <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_bin} onChange={(event) => change("has_bin", event.target.checked)} />Has Bin</label> : null}</div>{kind === "locations" ? <div className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Physical Locations</h3><p className="text-sm text-slate-500">Location must match a state in ERPNext Address. Capacity and barcode are generated by ERPNext when saved.</p>{form.physical_locations.map((row, index) => {
    const rack = masters.racks.find((record) => record.name === row.rack);
    const shelf = masters.shelves.find((record) => record.name === row.shelf);
    return <div key={index} className="grid items-end gap-3 border-b pb-3 md:grid-cols-[auto_1fr_1fr_1fr_auto]"><span className="p-2">{index + 1}</span>{select("Rack", row.rack, masters.racks, (value) => updateRow(index, { rack: value, shelf: "", bin: "" }))}{Number(rack?.has_shelf) ? select("Shelf", row.shelf, masters.shelves.filter((record) => record.rack === row.rack), (value) => updateRow(index, { shelf: value, bin: "" })) : <span />}{Number(shelf?.has_bin) ? select("Bin", row.bin, masters.bins.filter((record) => record.rack === row.rack && record.shelf === row.shelf), (value) => updateRow(index, { bin: value })) : <span />}<button type="button" disabled={form.physical_locations.length === 1} onClick={() => change("physical_locations", form.physical_locations.filter((_, i) => i !== index))} className="p-2 text-rose-700 disabled:opacity-30">Remove</button></div>;
  })}<button type="button" onClick={() => change("physical_locations", [...form.physical_locations, { rack: "", shelf: "", bin: "" }])} className="rounded-lg border px-4 py-2">Add row</button></div> : null}<button disabled={saving} className="rounded-lg bg-cyan-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-cyan-700 disabled:opacity-50">{saving ? "Saving..." : `Create ${titles[kind]}`}</button></form><div className="border-t pt-4"><h3 className="font-semibold">Existing {titles[kind]} records</h3><div className="mt-2 flex flex-wrap gap-2">{masters[kind].map((row) => <span key={row.name} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">{row.name}</span>)}</div></div></section>;
}
