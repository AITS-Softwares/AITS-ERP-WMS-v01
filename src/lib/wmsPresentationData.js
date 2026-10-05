// Display-only sample data: never written to operational records.
export const wmsPresentationData = {
  counts: { items: 248, warehouses: 5, salesOrders: 32 },
};

export function locationPresentationData() {
  const barcodesByDay = [18, 26, 22, 34, 29, 41, 36].map((labels, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    return { day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), labels, quantity: labels * 12 };
  });
  return {
    summary: { totalRacks: 18, totalShelves: 72, activeBins: 360, totalCapacity: 7200, itemsAssigned: 248, barcodesToday: 36 },
    byWarehouse: [
      { warehouse: "MUM-01", bins: 120, capacity: 2400 },
      { warehouse: "DEL-01", bins: 90, capacity: 1800 },
      { warehouse: "BLR-01", bins: 60, capacity: 1200 },
      { warehouse: "PUN-01", bins: 50, capacity: 1000 },
      { warehouse: "CHN-01", bins: 40, capacity: 800 },
    ],
    byRack: [60, 72, 54, 66, 48, 60].map((bins, index) => ({ rack: `R0${index + 1}`, bins })),
    byShelf: [96, 84, 108, 72].map((bins, index) => ({ shelf: `S0${index + 1}`, bins })),
    barcodesByDay,
    refreshedAt: new Date().toISOString(),
  };
}
