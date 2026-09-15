"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiDatabase, FiHash } from "react-icons/fi";

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl ${tone}`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default function WmsMasterTable({ title = "", description = "", resource, columns = [], action, rowHref }) {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let page = 1;
        let total = 0;
        // ERPNext limits each request to 100 records. Fetch all pages so the
        // Items card is a live count, not a fixed/first-page count.
        while (page <= 500) {
          const response = await fetch(`/api/wms/${resource}?${new URLSearchParams({ page: String(page), pageSize: "100" })}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.message || "Unable to count records.");
          const records = payload.data?.records || [];
          total += records.length;
          if (!payload.data?.hasMore || !records.length) break;
          page += 1;
        }
        if (!cancelled) setTotalCount(total);
      } catch {
        if (!cancelled) setTotalCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [resource]);

  const retry = () => { setSearch(""); setPage(1); load(); };

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl md:p-8">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="flex items-start gap-4">
          <span className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/30">
            <FiDatabase size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
          </div>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={`Total ${title || "Records"}`} value={totalCount ?? "-"} icon={FiHash} tone="bg-cyan-500" />
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder={`Search ${(title || "records").toLowerCase()}`}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:max-w-sm"
        />
        <button onClick={load} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Refresh
        </button>
      </div>

      {error ? (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p>{error}</p>
          {error.includes("not configured")
            ? <Link href="/wms/setup" className="mt-2 inline-block font-semibold underline">Open WMS connection setup</Link>
            : <button onClick={retry} className="mt-2 font-semibold underline">Try again</button>}
        </div>
      ) : null}

      {!error && loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading data...</div>
      ) : null}

      {!error && !loading ? <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr
                  key={record.name}
                  onClick={rowHref ? () => router.push(rowHref(record)) : undefined}
                  className={`transition hover:bg-slate-50 ${rowHref ? "cursor-pointer" : ""}`}
                >
                  {columns.map((column) => (
                    <td key={column.label} className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">
                      {column.render ? column.render(record) : (record[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!records.length ? <div className="p-10 text-center text-sm text-slate-500">No records found.</div> : null}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-500">Page {page}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent">
              Previous
            </button>
            <button disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent">
              Next
            </button>
          </div>
        </div>
      </> : null}
    </section>
  </div>;
}






