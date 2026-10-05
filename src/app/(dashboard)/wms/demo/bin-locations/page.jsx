"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiPrinter } from "react-icons/fi";
import { FaBarcode } from "react-icons/fa";

const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export default function BinLocations() {
  const [racks, setRacks] = useState([]), [shelves, setShelves] = useState([]), [bins, setBins] = useState([]), [message, setMessage] = useState("");
  const [form, setForm] = useState({ warehouseId: "MUM-01", state: "", rackId: "", shelfId: "", binNumber: "", capacity: "" });
  const [filters, setFilters] = useState({ warehouseId: "", rackId: "", shelfId: "", search: "" });

  const load = async () => {
    const [rackResponse, shelfResponse, binResponse] = await Promise.all([fetch("/api/wms/demo/racks", { headers: headers() }), fetch("/api/wms/demo/shelves", { headers: headers() }), fetch("/api/wms/demo/bin-locations", { headers: headers() })]);
    const [rackPayload, shelfPayload, binPayload] = await Promise.all([rackResponse.json(), shelfResponse.json(), binResponse.json()]);
    if (rackResponse.ok) setRacks(rackPayload.data || []);
    if (shelfResponse.ok) setShelves(shelfPayload.data || []);
    if (binResponse.ok) setBins(binPayload.data || []); else setMessage(binPayload.message);
  };
  useEffect(() => { load(); }, []);

  const visibleShelves = useMemo(() => shelves.filter((shelf) => String(shelf.rackId?._id || shelf.rackId) === form.rackId), [shelves, form.rackId]);
  const filterShelves = useMemo(() => shelves.filter((shelf) => !filters.rackId || String(shelf.rackId?._id || shelf.rackId) === filters.rackId), [shelves, filters.rackId]);
  const filteredBins = useMemo(() => bins.filter((bin) => (!filters.warehouseId || bin.warehouseId === filters.warehouseId) && (!filters.rackId || String(bin.rackId?._id || bin.rackId) === filters.rackId) && (!filters.shelfId || String(bin.shelfId?._id || bin.shelfId) === filters.shelfId) && (!filters.search || bin.binCode.toLowerCase().includes(filters.search.toLowerCase()))), [bins, filters]);
  const warehouses = [...new Set(bins.map((bin) => bin.warehouseId))].sort();
  const selectedRack = racks.find((rack) => rack._id === form.rackId);
  const selectedShelf = shelves.find((shelf) => shelf._id === form.shelfId);
  const binCode = form.warehouseId && selectedRack && selectedShelf && form.binNumber ? `${form.warehouseId}-${selectedRack.rackCode}-${selectedShelf.shelfCode}-${form.binNumber}` : "Auto-generated after selections";

  const save = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/wms/demo/bin-locations", { method: "POST", headers: headers(), body: JSON.stringify({ ...form, binCode }) });
    const payload = await response.json(); setMessage(payload.message || "");
    if (response.ok) { setForm((current) => ({ ...current, binNumber: "", capacity: "" })); load(); }
  };
  const createLabel = async (bin, autoPrint = false) => {
    const labelWindow = window.open("about:blank", "_blank");
    if (labelWindow) labelWindow.opener = null;
    try {
    const response = await fetch("/api/wms/demo/bin-labels", { method: "POST", headers: headers(), body: JSON.stringify({ binLocationId: bin._id }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to generate barcode.");
    const suffix = autoPrint ? "?autoprint=1" : "";
    const url = `/wms/locations/bin-labels/${payload.data._id}${suffix}`;
    if (labelWindow && !labelWindow.closed) labelWindow.location.replace(url);
    else window.location.assign(url);
    } catch (error) {
      if (labelWindow && !labelWindow.closed) labelWindow.close();
      setMessage(error.message || "Unable to generate barcode.");
    }
  };

  return <div className="space-y-6">
    <section className="rounded-3xl bg-slate-950 p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Warehouse location masters</p><h1 className="mt-2 text-3xl font-bold">Bin Locations</h1><p className="mt-2 text-sm text-slate-300">Create, filter, label, and print physical storage locations.</p></section>
    <div className="flex gap-3 text-sm font-semibold"><Link href="/wms/locations" className="text-cyan-700">Control Center</Link><span>/</span><span>Bin Locations</span><Link href="/wms/locations/item-bin-assignment" className="ml-auto text-cyan-700">Assign Item to Bin →</Link></div>
    {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm">{message}</p> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Create Bin Location</h2><form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-3"><input required placeholder="Warehouse code (MUM-01)" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5" /><input placeholder="State / location" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5" /><select required value={form.rackId} onChange={(e) => setForm({ ...form, rackId: e.target.value, shelfId: "" })} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select rack</option>{racks.map((rack) => <option key={rack._id} value={rack._id}>{rack.rackCode} - {rack.name}</option>)}</select><select required disabled={!form.rackId} value={form.shelfId} onChange={(e) => setForm({ ...form, shelfId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select shelf</option>{visibleShelves.map((shelf) => <option key={shelf._id} value={shelf._id}>{shelf.shelfCode}</option>)}</select><input required placeholder="Bin number (B01)" value={form.binNumber} onChange={(e) => setForm({ ...form, binNumber: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5" /><input type="number" min="0" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5" /><p className="rounded-xl bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-900 md:col-span-2">Bin Code: {binCode}</p><button disabled={!racks.length || !visibleShelves.length} className="rounded-xl bg-slate-950 px-4 py-2.5 font-bold text-white disabled:opacity-50">Save Bin</button></form></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Bin Location Register</h2><p className="mt-1 text-sm text-slate-500">{filteredBins.length} of {bins.length} locations shown</p></div><button onClick={() => setFilters({ warehouseId: "", rackId: "", shelfId: "", search: "" })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Clear filters</button></div><div className="mt-4 grid gap-3 md:grid-cols-4"><select value={filters.warehouseId} onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All warehouses</option>{warehouses.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}</select><select value={filters.rackId} onChange={(e) => setFilters({ ...filters, rackId: e.target.value, shelfId: "" })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All racks</option>{racks.map((rack) => <option key={rack._id} value={rack._id}>{rack.rackCode}</option>)}</select><select value={filters.shelfId} onChange={(e) => setFilters({ ...filters, shelfId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">All shelves</option>{filterShelves.map((shelf) => <option key={shelf._id} value={shelf._id}>{shelf.shelfCode}</option>)}</select><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search bin code" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></div></section>
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Bin Code</th><th className="p-3">Warehouse</th><th className="p-3">Rack / Shelf</th><th className="p-3">Capacity</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filteredBins.map((bin) => <tr key={bin._id} className="border-t"><td className="p-3 font-semibold">{bin.binCode}</td><td className="p-3">{bin.warehouseId}</td><td className="p-3">{bin.rackId?.rackCode} / {bin.shelfId?.shelfCode}</td><td className="p-3">{bin.capacity}</td><td className="p-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => createLabel(bin)} title="Generate barcode" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100"><FaBarcode /></button><button type="button" onClick={() => createLabel(bin, true)} title="Generate and print barcode" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-700"><FiPrinter /></button></div></td></tr>)}{!filteredBins.length ? <tr><td colSpan="5" className="p-8 text-center text-slate-500">No bin locations match the selected filters.</td></tr> : null}</tbody></table></section>
  </div>;
}
