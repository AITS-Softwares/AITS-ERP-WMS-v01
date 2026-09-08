"use client";

import Link from "next/link";
import { FiArrowUpRight, FiBox, FiClipboard, FiLayers, FiPackage, FiTruck } from "react-icons/fi";

const actions = [
  { href: "/wms/sales-dispatch", label: "Sales Dispatch", description: "Submit orders and move stock out", icon: FiTruck, tone: "bg-cyan-500" },
  { href: "/wms/grn/new", label: "Receive Stock", description: "Record a goods receipt note", icon: FiClipboard, tone: "bg-emerald-500" },
  { href: "/wms/carton-setup", label: "Carton & Barcode", description: "View UOMs and print carton labels", icon: FiPackage, tone: "bg-violet-500" },
  { href: "/wms/items", label: "Item Master", description: "Browse Finished Goods items", icon: FiBox, tone: "bg-amber-500" },
];

const process = [
  ["01", "Sales Order", "Choose a Draft or delivery-ready Sales Order."],
  ["02", "Submit", "Validate and submit a Draft order in ERPNext."],
  ["03", "Stock Out", "Select quantity and create the Delivery Note."],
  ["04", "Track", "Check the Delivery Note and remaining quantity."],
];

export default function WmsHomePage() {
  return <div className="space-y-6 pb-6">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl md:px-10 md:py-11">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative max-w-3xl"><p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">AITSERP · Warehouse Control Center</p><h1 className="mt-5 text-3xl font-black leading-tight md:text-5xl">Every warehouse move, <span className="text-cyan-300">under control.</span></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Process receiving, packaging, barcode labels, and customer dispatch from one simple workspace. ERPNext remains the source of truth.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/wms/sales-dispatch" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30">Start Sales Dispatch <FiArrowUpRight /></Link><Link href="/wms/grn/new" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Receive Stock</Link></div></div>
    </section>

    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Quick actions</p><h2 className="mt-1 text-2xl font-bold text-slate-900">What do you want to do?</h2></div><p className="hidden text-sm text-slate-500 md:block">Choose an operation to begin</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ href, label, description, icon: Icon, tone }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg"><span className={`grid h-11 w-11 place-items-center rounded-xl text-white ${tone}`}><Icon size={21} /></span><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{label}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div><FiArrowUpRight className="mt-1 shrink-0 text-slate-300 transition group-hover:text-cyan-600" /></div></Link>)}</div></section>

    <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><FiLayers size={20} /></span><div><h2 className="font-bold text-slate-900">Sales Dispatch flow</h2><p className="text-sm text-slate-500">From Sales Order to Delivery Note</p></div></div><div className="mt-7 grid gap-5 md:grid-cols-4">{process.map(([number, title, description], index) => <div key={title} className="relative"><span className="text-xs font-black tracking-widest text-cyan-600">{number}</span>{index < process.length - 1 ? <span className="absolute left-11 right-0 top-2 hidden h-px bg-slate-200 md:block" /> : null}<h3 className="mt-3 font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div>)}</div><Link href="/wms/sales-dispatch" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900">Open Sales Dispatch <FiArrowUpRight /></Link></div>
      <aside className="rounded-2xl bg-gradient-to-br from-cyan-700 to-cyan-950 p-6 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Warehouse tools</p><h2 className="mt-3 text-2xl font-bold">Set up before you move stock.</h2><p className="mt-3 text-sm leading-6 text-cyan-50/80">Confirm your ERPNext connection, item UOMs, and warehouse locations before creating live transactions.</p><div className="mt-6 space-y-2"><Link href="/wms/setup" className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/20"><span>ERPNext Connection</span><FiArrowUpRight /></Link><Link href="/wms/warehouses" className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/20"><span>Warehouses</span><FiArrowUpRight /></Link></div></aside></section>
  </div>;
}
