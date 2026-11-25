"use client";

import WmsMasterTable from "@/components/wms/WmsMasterTable";

const yesNo = (value) => value ? "Yes" : "No";

export default function WmsItemsPage() {
  return <WmsMasterTable title="Items" compactHeader resource="items" columns={[{ label: "Item Code", key: "item_code" }, { label: "Item Name", key: "item_name" }, { label: "Item Group", key: "item_group" }, { label: "Stock UOM", key: "stock_uom" }, { label: "Batch", render: (row) => yesNo(row.has_batch_no) }, { label: "Serial", render: (row) => yesNo(row.has_serial_no) }]} />;
}
