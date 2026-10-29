"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Renders a Code128 barcode as an inline SVG for on-screen preview and printing. */
export default function WmsBarcode({ value, height = 50, className = "", displayValue = true }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, String(value), { format: "CODE128", height, margin: 10, fontSize: 13, displayValue });
    } catch {
      // Invalid symbology input (e.g. empty string mid-render) — leave the previous render in place.
    }
  }, [value, height, displayValue]);

  if (!value) return null;
  return <svg ref={svgRef} className={className} role="img" aria-label={`Barcode ${value}`} />;
}
