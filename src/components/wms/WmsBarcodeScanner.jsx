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
      setStatus({ tone: "pending", message: "Looking up barcode..." });
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
      const detector = new window.BarcodeDetector({ formats: ["code_128"] });
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
          placeholder="Scan or type a carton barcode, then Enter"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <button type="button" onClick={() => lookup(code)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">Lookup</button>
        {cameraSupported ? (
          <button type="button" onClick={cameraOpen ? stopCamera : startCamera} className="rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-950">{cameraOpen ? "Stop camera" : "Scan with camera"}</button>
        ) : null}
      </div>
      {cameraOpen ? <video ref={videoRef} muted playsInline className="mt-3 aspect-video w-full max-w-sm rounded-xl bg-black" /> : null}
      {status ? <p className={`mt-2 text-xs font-medium ${toneClass}`}>{status.message}</p> : null}
    </div>
  );
}
