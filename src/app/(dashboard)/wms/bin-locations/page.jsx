"use client";

import { useEffect, useState } from "react";
import WmsLocationMasters from "@/components/wms/WmsLocationMasters";

export default function PhysicalLocationsPage() {
  return <div className="space-y-6"><WmsLocationMasters /><PhysicalLocationRegister /></div>;
}

function PhysicalLocationRegister() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetch("/api/wms/physical-locations", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Unable to load locations."); setRows(payload.data || []); })
      .catch((failure) => setError(failure.message)).finally(() => setLoading(false));
  }, []);
  const visible = rows.filter((row) => [row.warehouseName, row.location, row.rack, row.shelf, row.bin, row.barcode].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><section className="rounded-3xl bg-slate-950 p-7 text-white"><h1 className="text-3xl font-bold">Bin, Rack &amp; Shelf Locations</h1><p className="mt-3 text-slate-300">Locations configured in ERPNext Warehouse Bin Manager.</p></section>{error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}<input aria-label="Search locations" placeholder="Search warehouse, location, rack, shelf, bin or barcode" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border p-3" /><div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr>{["Warehouse", "Location", "Rack", "Shelf", "Bin", "Capacity", "Barcode"].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.name} className="border-t">{[row.warehouseName, row.location, row.rack, row.shelf, row.bin, row.capacity, row.barcode].map((value, index) => <td key={index} className="p-3">{value ?? "—"}</td>)}</tr>)}{!visible.length ? <tr><td colSpan={7} className="p-8 text-center">{loading ? "Loading locations..." : "No configured locations found."}</td></tr> : null}</tbody></table></div></div>;
}
