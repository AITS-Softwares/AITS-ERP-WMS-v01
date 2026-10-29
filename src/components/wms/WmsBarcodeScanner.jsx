"use client";

import { useEffect, useRef, useState } from "react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

/**
 * Reusable scan-to-resolve input. A USB/keyboard-wedge scanner types the
 * barcode into a normal text field and sends Enter — that's the baseline path
 * (see docs/wms-field-mapping-contract.md §Phase 3). Camera scanning is a
 * best-effort extra: it only appears where the browser exposes the native
 * BarcodeDetector API (Chrome/Edge on Android today; not Safari/iOS), and
 * simply feeds the same resolver.
 */
export default function WmsBarcodeScanner({ onResolve, autoFocus = false }) {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [scannedLocation, setScannedLocation] = useState(null);

  useEffect(() => {
    setCameraSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  async function lookup(value) {
    const term = String(value || "").trim();
    if (!term) return;
    try {
      setScannedLocation(null);
      setStatus({ tone: "pending", message: "Looking up barcode..." });
      const locationResponse = await fetch(`/api/wms/physical-locations/lookup?code=${encodeURIComponent(term)}`, { headers: authHeaders() });
      if (locationResponse.ok) {
        const locationPayload = await locationResponse.json();
        setScannedLocation(locationPayload.data);
        setStatus({ tone: "success", message: "Warehouse location found." });
        return;
      }
      const response = await fetch(`/api/wms/barcode-lookup?code=${encodeURIComponent(term)}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Barcode was not recognized.");
      setStatus({ tone: "success", message: `${payload.data.itemName} · ${payload.data.uom}` });
      onResolve?.(payload.data);
    } catch (error) {
      setStatus({ tone: "error", message: error.message || "Barcode was not recognized." });
    } finally {
      setCode("");
      inputRef.current?.focus();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      const formats = supportedFormats.filter((format) => ["code_128", "qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "code_93", "codabar", "itf"].includes(format));
      if (!formats.length) throw new Error("This browser cannot scan supported barcode formats with its camera.");
      const detector = new window.BarcodeDetector({ formats });
      const poll = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length) {
            stopCamera();
            await lookup(results[0].rawValue);
            return;
          }
        } catch {
          // Transient decode failure on a single frame — keep polling.
        }
        if (streamRef.current) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    } catch (error) {
      setStatus({ tone: "error", message: "Camera access was denied or is unavailable." });
      stopCamera();
    }
  }

  useEffect(() => () => stopCamera(), []);

  const toneClass = status?.tone === "error" ? "text-rose-600" : status?.tone === "success" ? "text-emerald-700" : "text-slate-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); lookup(code); } }}
          placeholder="Scan a location or carton barcode, then Enter"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <button type="button" onClick={() => lookup(code)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">Lookup</button>
        {cameraSupported ? (
          <button type="button" onClick={cameraOpen ? stopCamera : startCamera} className="rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-950">{cameraOpen ? "Stop camera" : "Scan with camera"}</button>
        ) : null}
      </div>
      {cameraOpen ? <video ref={videoRef} muted playsInline className="mt-3 aspect-video w-full max-w-sm rounded-xl bg-black" /> : null}
      {status ? <p className={`mt-2 text-xs font-medium ${toneClass}`}>{status.message}</p> : null}
      {scannedLocation ? <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm sm:grid-cols-4">
        {[["Warehouse", scannedLocation.warehouseName || scannedLocation.warehouse], ["Rack", scannedLocation.rack], ["Shelf", scannedLocation.shelf], ["Bin", scannedLocation.bin]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value || "Not assigned"}</dd></div>)}
      </dl> : null}
    </div>
  );
}
