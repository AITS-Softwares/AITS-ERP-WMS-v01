"use client";

import { useEffect, useState } from "react";
import WmsMasterTable from "@/components/wms/WmsMasterTable";

const REQUEST_PAGE_SIZE = 100; // safe chunk size per request

async function fetchAllCount(resource, onProgress) {
  let page = 1;
  let total = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(REQUEST_PAGE_SIZE) });
    const response = await fetch(`/api/wms/${resource}?${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Unable to load data.");

    const records = payload.data?.records || [];
    total += records.length;
    onProgress?.(total);

    // Stop as soon as the backend says there's nothing more.
    const hasMore = Boolean(payload.data?.hasMore);
    if (!hasMore || records.length === 0) break;

    page += 1;

    // Safety valve: stop after 500 pages (50,000 records) to avoid an
    // infinite loop if the backend never signals completion correctly.
    if (page > 500) break;
  }

  return total;
}

export default function WmsWarehousesPage() {
  const [totalCount, setTotalCount] = useState(null);
  const [counting, setCounting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCounting(true);
    fetchAllCount("warehouses", (runningTotal) => {
      if (!cancelled) setTotalCount(runningTotal);
    })
      .then((finalTotal) => { if (!cancelled) { setTotalCount(finalTotal); setCounting(false); } })
      .catch(() => { if (!cancelled) { setTotalCount(null); setCounting(false); } });
    return () => { cancelled = true; };
  }, []);

  const totalCard = (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-slate-600">Total Warehouses</p>
      <p className="mt-2 text-4xl font-black text-slate-950">
        {totalCount !== null ? totalCount : "-"}
        {counting ? <span className="ml-2 align-middle text-sm font-normal text-slate-400">counting...</span> : null}
      </p>
    </section>
  );

  return (
    <WmsMasterTable
      title="Warehouses"
      description="Live warehouses from ERPNext. WMS does not create a duplicate warehouse list, so every stock transaction will use the same ERPNext location."
      resource="warehouses"
      afterHeader={totalCard}
      columns={[
        { label: "Warehouse", key: "warehouse_name" },
        { label: "Company", key: "company" },
        { label: "Parent Warehouse", key: "parent_warehouse" },
        { label: "Type", render: (row) => row.is_group ? "Group" : "Storage" },
        { label: "ERPNext Name", key: "name" },
      ]}
    />
  );
}