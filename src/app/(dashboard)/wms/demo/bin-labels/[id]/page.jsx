"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FiPrinter } from "react-icons/fi";
import WmsBarcode from "@/components/wms/WmsBarcode";

export default function BinBarcodeLabel() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [label, setLabel] = useState(null), [error, setError] = useState("");
  useEffect(() => { fetch("/api/wms/demo/barcodes", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Unable to load barcode label."); return payload; }).then((payload) => { const found = (payload.data || []).find((row) => row._id === id); if (!found) throw new Error("Barcode label not found."); setLabel(found); }).catch((loadError) => setError(loadError.message)); }, [id]);
  useEffect(() => { if (label && searchParams.get("autoprint") === "1") window.setTimeout(() => window.print(), 300); }, [label, searchParams]);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!label) return <p className="p-6 text-sm text-slate-500">Loading barcode label...</p>;
  const bin = label.binLocationId;
  return <div className="mx-auto max-w-2xl space-y-6"><div className="flex items-center justify-between print:hidden"><Link href="/wms/locations/bin-locations" className="text-sm font-bold text-cyan-700">← Back to Bin Locations</Link><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><FiPrinter /> Print Label</button></div><section className="rounded-2xl border-2 border-slate-900 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700">Warehouse bin location</p><h1 className="mt-2 text-3xl font-black text-slate-950">{bin?.binCode || label.warehouseId}</h1><p className="mt-2 text-sm text-slate-600">{label.warehouseId} · Rack {bin?.rackId?.rackCode || "-"} · Shelf {bin?.shelfId?.shelfCode || "-"}</p><div className="mt-7 flex justify-center"><WmsBarcode value={label.barcodeValue} height={88} /></div><p className="mt-4 font-mono text-sm text-slate-700">{label.barcodeValue}</p><p className="mt-5 text-xs text-slate-500">Scan this label to identify the physical warehouse bin.</p></section></div>;
}
