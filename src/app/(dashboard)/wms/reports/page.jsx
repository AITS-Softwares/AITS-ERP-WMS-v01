import Link from "next/link";
import { FiArrowRight, FiBarChart2, FiDatabase } from "react-icons/fi";

const categories = [
  { href: "/wms/reports/custom", title: "Custom Reports", description: "Reports tailored to your warehouse operations and location tracking.", icon: FiBarChart2 },
  { href: "/wms/reports/standard", title: "ERP Standard Reports", description: "Open warehouse reports from your connected ERPNext system.", icon: FiDatabase },
];

export default function WmsReportsPage() {
  return <div className="space-y-6">
    <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Warehouse reporting</p>
      <h1 className="mt-2 text-3xl font-bold">Reports</h1>
      <p className="mt-3 text-sm text-slate-300">Choose a report category to continue.</p>
    </header>
    <div className="grid gap-5 md:grid-cols-2">{categories.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
      <span className="inline-flex rounded-xl bg-cyan-50 p-3 text-cyan-700"><Icon size={25} /></span>
      <h2 className="mt-5 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">Open reports <FiArrowRight className="transition-transform group-hover:translate-x-1" /></span>
    </Link>)}</div>
  </div>;
}
