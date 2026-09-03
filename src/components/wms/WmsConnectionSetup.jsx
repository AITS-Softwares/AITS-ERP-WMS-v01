"use client";

import { useEffect, useState } from "react";
import { isWmsBarcodeUiEnabled, setWmsBarcodeUiEnabled } from "@/components/wms/wmsBarcodePreference";

const emptyForm = { label: "Primary ERPNext", baseUrl: "", apiKey: "", apiSecret: "", apiKeyPreview: "", hasApiSecret: false, lastTestStatus: "", lastTestMessage: "" };

export default function WmsConnectionSetup() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [barcodeUiEnabled, setBarcodeUiEnabled] = useState(true);

  useEffect(() => { setBarcodeUiEnabled(isWmsBarcodeUiEnabled()); }, []);
  function toggleBarcodeUi() {
    const next = !barcodeUiEnabled;
    setBarcodeUiEnabled(next);
    setWmsBarcodeUiEnabled(next);
  }

  const request = (url, options = {}) => fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}`, ...(options.headers || {}) } });
  const show = (tone, message) => setNotice({ tone, message });

  async function load() {
    try {
      setLoading(true);
      const response = await request("/api/wms/connection");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load ERPNext setup.");
      if (payload.connection) setForm((current) => ({ ...current, ...payload.connection, apiKey: "", apiSecret: "" }));
    } catch (error) {
      show("error", error.message || "Unable to load ERPNext setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try {
      setSaving(true); setNotice(null);
      const response = await request("/api/wms/connection", { method: "POST", body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to save ERPNext setup.");
      setForm((current) => ({ ...current, ...payload.connection, apiKey: "", apiSecret: "" }));
      show("success", payload.message);
    } catch (error) { show("error", error.message || "Unable to save ERPNext setup."); }
    finally { setSaving(false); }
  }

  async function testConnection() {
    try {
      setTesting(true); setNotice(null);
      const response = await request("/api/wms/connection/test", { method: "POST", body: "{}" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "ERPNext test failed.");
      show("success", `${payload.message}${payload.loggedUser ? ` Signed in as ${payload.loggedUser}.` : ""}`);
      await load();
    } catch (error) { show("error", error.message || "ERPNext test failed."); }
    finally { setTesting(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">WMS foundation</p>
        <h1 className="mt-2 text-3xl font-bold">ERPNext connection</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">This is a WMS-specific screen, but it securely uses the same ERPNext connection saved for this company. Distributor and WMS therefore always read from the same ERPNext site.</p>
      </section>
      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.message}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-lg font-bold">Connection details</h2><p className="mt-1 text-sm text-slate-500">Use an ERPNext System Manager or Administrator API key and secret.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.lastTestStatus === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{form.lastTestStatus === "success" ? "Connection verified" : "Not verified"}</span></div>
        {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading connection...</p> : <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Connection name<input className={inputClass} value={form.label} onChange={(event) => setForm((state) => ({ ...state, label: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">ERPNext site URL<input className={inputClass} placeholder="https://your-site.frappe.cloud" value={form.baseUrl} onChange={(event) => setForm((state) => ({ ...state, baseUrl: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">API key<input className={inputClass} autoComplete="off" placeholder={form.apiKeyPreview || "API key"} value={form.apiKey} onChange={(event) => setForm((state) => ({ ...state, apiKey: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">API secret<input className={inputClass} type="password" autoComplete="new-password" placeholder={form.hasApiSecret ? "Saved. Enter only to replace." : "API secret"} value={form.apiSecret} onChange={(event) => setForm((state) => ({ ...state, apiSecret: event.target.value }))} /></label>
        </div>}
        {form.lastTestMessage ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Last test: {form.lastTestMessage}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={saving || loading} onClick={save} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save connection"}</button><button type="button" disabled={testing || saving || loading} onClick={testConnection} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60">{testing ? "Testing..." : "Test saved connection"}</button></div>
      </section>
      <p className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-900"><strong>Safe by design:</strong> API secrets are encrypted in the AITSERP database and are never returned to the browser after saving.</p>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-bold">Barcode scanning UI</h2><p className="mt-1 max-w-xl text-sm text-slate-500">Hides the scan input and barcode labels on this device (e.g. an office workstation with no scanner). ERPNext's Item Barcode / UOM data stays connected either way — this only affects what's shown here.</p></div>
          <button type="button" onClick={toggleBarcodeUi} className={`w-max rounded-xl px-5 py-2.5 text-sm font-bold ${barcodeUiEnabled ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-700"}`}>{barcodeUiEnabled ? "Shown on this device" : "Hidden on this device"}</button>
        </div>
      </section>
    </div>
  );
}

