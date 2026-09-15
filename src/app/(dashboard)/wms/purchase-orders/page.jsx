"use client";

import Link from "next/link";
import WmsMasterTable from "@/components/wms/WmsMasterTable";

function money(row) {
  const amount = Number(row.grand_total || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: row.currency || "INR", maximumFractionDigits: 2 }).format(amount);
}

const newPoAction = <Link href="/wms/purchase-orders/new" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950">New Purchase Order</Link>;

export default function WmsPurchaseOrdersPage() {
  return <WmsMasterTable
    title="Purchase Orders"
    description="ERPNext Purchase Orders — create, submit, and receive against them here. These records are read and written directly against ERPNext."
    resource="purchase-orders"
    action={newPoAction}
    rowHref={(row) => `/wms/purchase-orders/${encodeURIComponent(row.name)}`}
    columns={[
      { label: "Purchase Order", key: "name" },
      { label: "Supplier", render: (row) => row.supplier_name || row.supplier || "-" },
      { label: "Order Date", key: "transaction_date" },
      { label: "Required By", key: "schedule_date" },
      { label: "Warehouse", key: "set_warehouse" },
      { label: "Status", render: (row) => Number(row.docstatus) === 0 ? "Draft" : row.status },
      { label: "Total", render: money },
    ]}
  />;
}
