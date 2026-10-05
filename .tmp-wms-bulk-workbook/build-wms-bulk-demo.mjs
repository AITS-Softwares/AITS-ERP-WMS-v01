import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/WMS/AITS-ERP-WMS-v01/outputs/wms-bulk-demo";
const outputFile = `${outputDir}/wms-bulk-demo-data.xlsx`;

const headers = [
  "warehouseCode", "state", "rackCode", "rackName", "rackCapacity",
  "shelfCode", "shelfCapacity", "binNumber", "binCapacity", "itemCode", "itemName",
];

const rows = [
  ["MUM-01", "Maharashtra", "R01", "Receiving Rack", 200, "S01", 100, "B01", 25, "ITEM-A", "Test Product A"],
  ["MUM-01", "Maharashtra", "R01", "Receiving Rack", 200, "S01", 100, "B02", 25, "ITEM-B", "Test Product B"],
  ["MUM-01", "Maharashtra", "R01", "Receiving Rack", 200, "S02", 100, "B01", 25, "ITEM-C", "Test Product C"],
  ["MUM-01", "Maharashtra", "R01", "Receiving Rack", 200, "S02", 100, "B02", 25, "ITEM-D", "Test Product D"],
  ["MUM-01", "Maharashtra", "R02", "Reserve Rack", 160, "S03", 80, "B01", 20, "ITEM-E", "Test Product E"],
  ["MUM-01", "Maharashtra", "R02", "Reserve Rack", 160, "S03", 80, "B02", 20, "ITEM-F", "Test Product F"],
  ["MUM-01", "Maharashtra", "R02", "Reserve Rack", 160, "S04", 80, "B01", 20, "ITEM-G", "Test Product G"],
  ["MUM-01", "Maharashtra", "R02", "Reserve Rack", 160, "S04", 80, "B02", 20, "ITEM-H", "Test Product H"],
  ["BLR-01", "Karnataka", "R03", "Dispatch Rack", 180, "S05", 90, "B01", 30, "ITEM-I", "Test Product I"],
  ["BLR-01", "Karnataka", "R03", "Dispatch Rack", 180, "S05", 90, "B02", 30, "ITEM-J", "Test Product J"],
  ["BLR-01", "Karnataka", "R04", "Overflow Rack", 120, "S06", 60, "B01", 15, "ITEM-K", "Test Product K"],
  ["BLR-01", "Karnataka", "R04", "Overflow Rack", 120, "S06", 60, "B02", 15, "ITEM-L", "Test Product L"],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Bulk Upload");
sheet.showGridLines = false;
sheet.tabColor = "#0F2747";

sheet.getRange("A2:K2").merge();
sheet.getRange("A2").values = [["Local WMS Bulk Upload Demo Data"]];
sheet.getRange("A3:K3").merge();
sheet.getRange("A3").values = [["Upload this entire worksheet once. Each row creates or reuses a rack, shelf, bin location, and item assignment."]];
sheet.getRange("A5:K5").values = [headers];
sheet.getRange(`A6:K${5 + rows.length}`).values = rows;

sheet.getRange("A2:K2").format = {
  fill: "#0F2747",
  font: { name: "Arial", size: 14, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
sheet.getRange("A3:K3").format = {
  font: { name: "Arial", size: 10, italic: true, color: "#475569" },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
sheet.getRange("A5:K5").format = {
  fill: "#123B63",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#D9E3F0" },
};
sheet.getRange(`A6:K${5 + rows.length}`).format = {
  font: { name: "Arial", size: 10, color: "#172033" },
  verticalAlignment: "center",
  borders: { preset: "insideHorizontal", style: "thin", color: "#E2E8F0" },
};
sheet.getRange(`E6:E${5 + rows.length}`).format.numberFormat = "#,##0";
sheet.getRange(`G6:G${5 + rows.length}`).format.numberFormat = "#,##0";
sheet.getRange(`I6:I${5 + rows.length}`).format.numberFormat = "#,##0";
sheet.getRange("A2:K2").format.rowHeight = 26;
sheet.getRange("A3:K3").format.rowHeight = 22;
sheet.getRange("A5:K5").format.rowHeight = 22;
sheet.getRange(`A6:K${5 + rows.length}`).format.rowHeight = 20;

const widths = [16, 16, 12, 22, 14, 12, 15, 12, 14, 14, 22];
widths.forEach((width, columnIndex) => {
  sheet.getRangeByIndexes(0, columnIndex, rows.length + 5, 1).format.columnWidth = width;
});

const table = sheet.tables.add(`A5:K${5 + rows.length}`, true, "WmsBulkUploadTable");
table.style = "TableStyleMedium2";
sheet.freezePanes.freezeRows(5);

workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Bulk Upload!A2:K17", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 12 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "Bulk Upload", range: "A1:K17", scale: 1.5, format: "png" });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/wms-bulk-demo-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputFile);
console.log(`Saved ${outputFile}`);
