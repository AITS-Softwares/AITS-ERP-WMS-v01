"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WmsMasterTable({ title, description, resource, columns, action, rowHref }) {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search.trim()) query.set("search", search.trim());
      const response = await fetch(`/api/wms/${resource}?${query}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load ERPNext data.");
      setRecords(payload.data?.records || []); setHasMore(Boolean(payload.data?.hasMore));
    } catch (requestError) { setError(requestError.message || "Unable to load ERPNext data."); }
    finally { setLoading(false); }
  }, [page, resource, search]);

  useEffect(() => { const timer = setTimeout(load, search ? 300 : 0); return () => clearTimeout(timer); }, [load, search]);
  const retry = () => { setSearch(""); setPage(1); load(); };

  return <div className="space-y-6">
    <section className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white md:flex-row md:items-end md:p-8"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Live ERPNext data</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p></div>{action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}</section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${title.toLowerCase()}`} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 sm:max-w-sm" /><button onClick={load} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Refresh</button></div>
      {error ? <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{error}</p>{error.includes("not configured") ? <Link href="/wms/setup" className="mt-2 inline-block font-semibold underline">Open WMS connection setup</Link> : <button onClick={retry} className="mt-2 font-semibold underline">Try again</button>}</div> : null}
      {!error && loading ? <div className="p-10 text-center text-sm text-slate-500">Loading live ERPNext data...</div> : null}
      {!error && !loading ? <><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column.label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record.name} onClick={rowHref ? () => router.push(rowHref(record)) : undefined} className={`hover:bg-slate-50 ${rowHref ? "cursor-pointer" : ""}`}>{columns.map((column) => <td key={column.label} className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">{column.render ? column.render(record) : (record[column.key] ?? "-")}</td>)}</tr>)}</tbody></table></div>{!records.length ? <div className="p-10 text-center text-sm text-slate-500">No records found in ERPNext.</div> : null}<div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm"><span className="text-slate-500">Page {page}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button></div></div></> : null}
    </section>
  </div>;
}
