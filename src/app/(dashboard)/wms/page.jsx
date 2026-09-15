"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiBox, FiTruck, FiMapPin, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b"];

function CountCard({ label, value, description, href, icon: Icon, tone }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl ${tone}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ${tone}`}>
          <Icon size={20} />
        </span>
      </div>
    </Link>
  );
}

export default function WmsHomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setRefreshing(true); setError("");
      const response = await fetch("/api/wms/dashboard", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load WMS data.");
      setData(payload.data);
    } catch (loadError) { setError(loadError.message || "Unable to load WMS data."); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    loadDashboard();
    const refreshTimer = setInterval(loadDashboard, 60000);
    return () => clearInterval(refreshTimer);
  }, [loadDashboard]);

  const notConfigured = error.includes("not configured");

  const chartData = data ? [
    { name: "Items", count: data.counts?.items ?? 0 },
    { name: "Warehouses", count: data.counts?.warehouses ?? 0 },
    { name: "Sales Dispatch", count: data.counts?.salesOrders ?? 0 },
  ] : [];

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-7 text-white shadow-xl md:p-10">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Phase 3 · Barcode &amp; Master Carton</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">Warehouse operations, connected directly to ERPNext.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">This workspace is the new warehouse front end. ERPNext stays the only source of truth for stock, warehouses, purchase orders, UOMs, and barcode records.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/wms/sales-dispatch" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300">Open Sales Dispatch</Link>
          <Link href="/wms/grn/new" className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Record a GRN</Link>
          <Link href="/wms/carton-setup" className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Item &amp; Carton Setup</Link>
          <button type="button" onClick={loadDashboard} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"><FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </div>
    </section>

    {error ? (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        <p className="font-bold">WMS is not connected yet</p>
        <p className="mt-1">{error}</p>
        {notConfigured ? <Link href="/wms/setup" className="mt-3 inline-block font-bold underline">Open ERPNext connection setup</Link> : null}
      </section>
    ) : null}

    {!error && !data ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Checking live ERPNext master data...
      </div>
    ) : null}

    {data ? <>
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <CountCard label="Finished Goods Items" value={data.counts?.items ?? "-"} description="Live ERPNext Finished Goods total" href="/wms/items" icon={FiBox} tone="bg-cyan-500" />
        <CountCard label="Warehouses" value={data.counts?.warehouses ?? "-"} description="Live active ERPNext warehouses" href="/wms/warehouses" icon={FiMapPin} tone="bg-violet-500" />
        <CountCard label="Sales Dispatch Queue" value={data.counts?.salesOrders ?? "-"} description="Orders ready for warehouse action" href="/wms/sales-dispatch" icon={FiTruck} tone="bg-amber-500" />
      </div>

      {/* Graph section */}
      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
              <FiTrendingUp size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Overview</p>
              <h2 className="text-2xl font-bold text-slate-900">Master Data Counts</h2>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Bar dataKey="count" fill="url(#barFill)" radius={[8, 8, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-slate-100 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Distribution</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Share by Category</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">What is ready now</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>• One encrypted ERPNext connection, shared safely with Distributor.</li>
          <li>• Read/write ERPNext Purchase Orders — create, save as draft, or submit.</li>
          <li>• GRN screen that submits ERPNext's Purchase Receipt doctype and updates real stock.</li>
          <li>• Master Carton UOM + conversion factor + barcode, stored on ERPNext's own Item doctype.</li>
          <li>• Scan-to-resolve on the GRN screen: a carton barcode auto-adds the right quantity to the right line.</li>
          <li>• No local stock balance, warehouse, or purchase-order copies created.</li>
        </ul>
      </section>
    </> : null}
  </div>;
}
