"use client";

import WmsMasterTable from "@/components/wms/WmsMasterTable";

export default function WmsUomsPage() {
  return <WmsMasterTable title="Units of Measure" compactHeader resource="uoms" columns={[{ label: "UOM", key: "name" }, { label: "Whole Number Only", render: (row) => row.must_be_whole_number ? "Yes" : "No" }, { label: "Last Updated", render: (row) => row.modified ? new Date(row.modified).toLocaleString() : "-" }]} />;
}
