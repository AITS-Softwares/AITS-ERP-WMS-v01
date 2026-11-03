export function locationQrText(row) {
  const value = (field) => String(field ?? "").trim() || "-";
  return [
    `Warehouse: ${value(row.warehouseName || row.warehouse)}`,
    `Rack: ${value(row.rack)}`,
    `Shelf: ${value(row.shelf)}`,
    `Bin: ${value(row.bin)}`,
    `Location: ${value(row.location)}`,
    `Capacity: ${value(row.capacity)}`,
    `Location ID: ${value(row.name)}`,
  ].join(" | ");
}

/** Compact Code 128 payload. Values follow the location table column order. */
export function locationBarcodeText(row) {
  const value = (field) => String(field ?? "").trim() || "-";
  return [row.warehouseName || row.warehouse, row.location, row.rack, row.shelf, row.bin, row.capacity]
    .map(value)
    .join("|");
}

export function findScannedLocation(rows, scanned) {
  const code = String(scanned ?? "").trim();
  if (!code) return null;
  const matches = rows.filter((row) => String(row.barcode || "").trim() === code || row.name === code || locationQrText(row) === code || locationBarcodeText(row) === code);
  return matches.length === 1 ? matches[0] : null;
}
