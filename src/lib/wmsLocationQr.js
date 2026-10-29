export function locationQrText(row) {
  const value = (field) => String(field ?? "").trim() || "Not assigned";
  return [
    `Warehouse: ${value(row.warehouseName || row.warehouse)}`,
    `Rack: ${value(row.rack)}`,
    `Shelf: ${value(row.shelf)}`,
    `Bin: ${value(row.bin)}`,
    `Location: ${value(row.location)}`,
    `Location ID: ${value(row.name)}`,
  ].join(" | ");
}

export function findScannedLocation(rows, scanned) {
  const code = String(scanned ?? "").trim();
  if (!code) return null;
  const matches = rows.filter((row) => String(row.barcode || "").trim() === code || row.name === code || locationQrText(row) === code);
  return matches.length === 1 ? matches[0] : null;
}
