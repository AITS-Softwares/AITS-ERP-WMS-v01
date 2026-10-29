"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiBarChart2, FiDownload, FiRefreshCw } from "react-icons/fi";
import { customReports, filterCustomReport, customReportCsv } from "@/lib/wmsCustomReports";

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function WmsCustomReportsPage() {
  const [type, setType] = useState("stock");
  const [from, setFrom] = useState(() => `${localDate().slice(0, 7)}-01`);
  const [to, setTo] = useState(localDate);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  const report = customReports.find((entry) => entry.id === type);
  const rows = useMemo(() => filterCustomReport(result?.rows || [], { search, warehouse }), [result, search, warehouse]);
  const warehouses = useMemo(() => [...new Set((result?.rows || []).map((row) => row.warehouse || row.warehouseName).filter(Boolean))].sort(), [result]);
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const visible = rows.slice((page - 1) * 25, page * 25);
  function clear() {
    requestId.current += 1;
    controller.current?.abort();
    setResult(null); setError(""); setLoading(false); setWarehouse(""); setSearch(""); setPage(1);
  }
  async function run(event) {
    event.preventDefault();
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const id = ++requestId.current;
    setLoading(true); setError(""); setResult(null); setPage(1); setWarehouse("");
    try {
      const response = await fetch(`/api/wms/reports/custom?${new URLSearchParams({ type, from, to })}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, signal: abort.signal, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load custom report.");
      if (id === requestId.current) setResult(payload.data);
    } catch (failure) {
      if (id === requestId.current && failure.name !== "AbortError") setError(failure.message);
    } finally { if (id === requestId.current) setLoading(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([customReportCsv(report.columns, rows)], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `wms-${type}-${localDate()}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-6">
    <Link href="/wms/reports" className="text-sm font-semibold text-cyan-700">← All reports</Link>
    <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white md:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Live ERPNext data</p><h1 className="mt-2 text-3xl font-bold">Custom Reports</h1><p className="mt-3 text-sm text-slate-300">Warehouse balances, location capacity and dispatch history.</p></header>
    <div className="grid gap-4 lg:grid-cols-3">{customReports.map((entry) => <button key={entry.id} type="button" aria-pressed={type === entry.id} onClick={() => { clear(); setType(entry.id); }} className={`rounded-2xl border p-5 text-left transition ${type === entry.id ? "border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200" : "border-slate-200 bg-white hover:border-cyan-300"}`}><FiBarChart2 className="text-cyan-700" size={22} /><h2 className="mt-3 font-bold">{entry.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{entry.description}</p></button>)}</div>
    <form onSubmit={run} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      {type === "stock-out" ? <><label className="grid gap-2 text-sm font-semibold">From<input required type="date" value={from} max={to} onChange={(event) => { clear(); setFrom(event.target.value); }} className="rounded-xl border border-slate-300 p-2.5" /></label><label className="grid gap-2 text-sm font-semibold">To<input required type="date" value={to} min={from} onChange={(event) => { clear(); setTo(event.target.value); }} className="rounded-xl border border-slate-300 p-2.5" /></label></> : <p className="mr-auto text-sm text-slate-600">{type === "stock" ? "Current warehouse stock balances" : "Current location master configuration"}</p>}
      <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />{loading ? "Loading…" : "Run report"}</button>
    </form>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {loading ? <p role="status" className="text-sm text-cyan-700">Loading report from ERPNext…</p> : null}
    {result ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-100 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{report.title}</h2><p className="mt-1 text-sm text-slate-500">{rows.length} matching rows · Updated {new Date(result.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p></div><button onClick={download} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><FiDownload />Export CSV</button></div>
        <p className="text-sm text-slate-500">{result.note}</p>
        {result.truncated ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Partial report: limited to {result.limit} {type === "stock-out" ? "Delivery Notes. Narrow the date range for a complete report" : "stock records"}. Filters and export apply to loaded records only.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Search report" placeholder="Search item, location or document" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 p-3 text-sm" /><select aria-label="Filter by warehouse" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 bg-white p-3 text-sm"><option value="">All warehouses</option>{warehouses.map((name) => <option key={name}>{name}</option>)}</select></div>
      </div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr>{report.columns.map(([key, label]) => <th key={key} className="whitespace-nowrap p-3 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={index} className="border-t border-slate-100 hover:bg-slate-50">{report.columns.map(([key]) => <td key={key} className="whitespace-nowrap p-3">{row[key] === "" || row[key] == null ? "—" : String(row[key])}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={report.columns.length} className="p-8 text-center text-slate-500">No records match this report and its filters.</td></tr> : null}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
    </section> : !loading && !error ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Choose a report and click Run report to load current data.</p> : null}
  </div>;
}
