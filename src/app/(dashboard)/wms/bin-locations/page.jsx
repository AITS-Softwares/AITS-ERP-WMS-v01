"use client";

import { useEffect, useState } from "react";
import WmsLocationMasters from "@/components/wms/WmsLocationMasters";
import WmsBarcode from "@/components/wms/WmsBarcode";
import { findScannedLocation } from "@/lib/wmsLocationQr";

export default function PhysicalLocationsPage() {
  return <div className="space-y-6"><WmsLocationMasters /><PhysicalLocationRegister /></div>;
}

function PhysicalLocationRegister() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scan, setScan] = useState("");
  const [matches, setMatches] = useState(null);
  useEffect(() => {
    fetch("/api/wms/physical-locations", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Unable to load locations."); setRows(payload.data || []); })
      .catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  }, []);
  function lookup(event) {
    event.preventDefault();
    const code = scan.trim();
    if (!code || loading) return;
    const match = findScannedLocation(rows, code);
    setMatches(match ? [match] : []);
    setScan("");
  }
  const visible = rows.filter((row) => [row.warehouseName, row.location, row.rack, row.shelf, row.bin, row.barcode].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <section className="rounded-3xl bg-slate-950 p-7 text-white"><h1 className="text-3xl font-bold">Bin, Rack &amp; Shelf Locations</h1><p className="mt-3 text-slate-300">Scan a location barcode in Sales Dispatch to stock out one unit of your selected item.</p></section>
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <form onSubmit={lookup} className="space-y-2">
        <label htmlFor="location-barcode" className="block font-semibold">Scan location barcode</label>
        <p id="scan-help" className="text-sm text-slate-500">Scan here to view warehouse, rack, shelf and bin details. Use the scan field in Sales Dispatch to stock out.</p>
        <div className="flex flex-wrap gap-3"><input id="location-barcode" aria-describedby="scan-help" autoComplete="off" value={scan} onChange={(event) => setScan(event.target.value)} placeholder="Scan barcode here" className="min-w-0 flex-1 rounded-xl border p-3" /><button disabled={loading || !!error || !scan.trim()} className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Find location</button></div>
      </form>
      <div aria-live="polite">
        {matches?.length === 0 ? <p role="status" className="text-amber-700">No location found for this barcode. Scan another location label.</p> : null}
        {matches?.map((row) => <div key={row.name} className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><h2 className="font-semibold">Scanned location</h2><dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Warehouse", row.warehouseName], ["Rack", row.rack], ["Shelf", row.shelf], ["Bin", row.bin], ["Location", row.location], ["Capacity", row.capacity]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="font-semibold">{value === "" || value == null ? "—" : value}</dd></div>)}</dl></div>)}
      </div>
    </section>
    <input aria-label="Search locations" placeholder="Search warehouse, location, rack, shelf, bin or barcode" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border p-3" />
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr>{["Warehouse", "Location", "Rack", "Shelf", "Bin", "Capacity", "Barcode"].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.name} className="border-t">{[row.warehouseName, row.location, row.rack, row.shelf, row.bin, row.capacity].map((value, index) => <td key={index} className="p-3">{value === "" || value == null ? "—" : value}</td>)}<td className="p-3"><div className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm"><WmsBarcode value={row.barcode || row.name} height={90} displayValue={false} className="block h-auto w-[280px]" /></div></td></tr>)}{!visible.length ? <tr><td colSpan={7} className="p-8 text-center">{loading ? "Loading locations..." : "No configured locations found."}</td></tr> : null}</tbody></table></div>
  </div>;
}
