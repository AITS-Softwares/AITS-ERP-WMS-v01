"use client";

// Client-side, per-device preference. Per the Phase 3 plan: barcode/scan UI
// can be hidden on screens/roles that don't want it, while the underlying
// ERPNext Item Barcode / UOM link stays fully functional either way.
const KEY = "wms-barcode-ui-enabled";

export function isWmsBarcodeUiEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(KEY);
  return stored === null ? true : stored === "true";
}

export function setWmsBarcodeUiEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, String(Boolean(enabled)));
}
