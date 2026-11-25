"use client";

import Link from "next/link";
import WmsMasterTable from "@/components/wms/WmsMasterTable";

function money(row) {
  const amount = Number(row.grand_total || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: row.currency || "INR", maximumFractionDigits: 2 }).format(amount);
}

const newGrnAction = <Link href="/wms/grn/new" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">New GRN</Link>;

export default function WmsGrnListPage() {
  return <WmsMasterTable title="GRN (Purchase Receipts)" compactHeader resource="purchase-receipts" action={newGrnAction} rowHref={(row) => `/wms/grn/${encodeURIComponent(row.name)}`} columns={[{ label: "GRN", key: "name" }, { label: "Supplier", render: (row) => row.supplier_name || row.supplier || "-" }, { label: "Posting Date", key: "posting_date" }, { label: "Warehouse", key: "set_warehouse" }, { label: "Status", key: "status" }, { label: "Total", render: money }]} />;
}
