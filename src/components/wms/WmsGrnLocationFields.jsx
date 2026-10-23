"use client";
import { useState } from "react";

const unique = (rows, field) => [...new Set(rows.map((row) => row[field] || ""))];
export default function WmsGrnLocationFields({ locations, defaultLocation, onChange }) {
  const [selection, setSelection] = useState(null);
  const inherited = locations.find((row) => row.name === defaultLocation);
  const current = selection || { parent: inherited?.parent || "", rack: inherited?.rack || "", shelf: inherited?.shelf || "", bin: inherited?.bin || "" };
  const paths = locations.filter((row) => row.parent === current.parent);
  const shelves = paths.filter((row) => row.rack === current.rack);
  const bins = shelves.filter((row) => (row.shelf || "") === current.shelf);
  function update(field, value) {
    const next = { ...current, [field]: value };
    if (field === "parent") Object.assign(next, { rack: "", shelf: "", bin: "" });
    if (field === "rack") Object.assign(next, { shelf: "", bin: "" });
    if (field === "shelf") next.bin = "";
    setSelection(next);
    const match = locations.find((row) => row.parent === next.parent && row.rack === next.rack && (row.shelf || "") === next.shelf && (row.bin || "") === next.bin);
    onChange({ physicalLocation: match?.name || "", locationPending: !match });
  }
  function dropdown(label, field, values, disabled = false) {
    return <label className="grid gap-1 text-xs font-semibold text-slate-600">{label}<select aria-label={label} value={current[field]} disabled={disabled} onChange={(event) => update(field, event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Select {label.toLowerCase()}</option>{values.filter(Boolean).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>;
  }
  return <div className="grid gap-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3 md:col-span-full md:grid-cols-4">{dropdown("Physical Location", "parent", unique(locations, "parent"))}{dropdown("Rack", "rack", unique(paths, "rack"), !current.parent)}{dropdown("Shelf", "shelf", unique(shelves, "shelf"), !current.rack || !unique(shelves, "shelf").some(Boolean))}{dropdown("Bin", "bin", unique(bins, "bin"), !current.rack || !unique(bins, "bin").some(Boolean))}<p className="text-xs font-normal text-slate-500 md:col-span-4">Warehouse: {locations.find((row) => row.parent === current.parent)?.warehouseName || "Select a physical location"}</p></div>;
}
