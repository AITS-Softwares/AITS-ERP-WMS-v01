"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WmsSelect from "@/components/wms/WmsSelect";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function asOptions(records, valueKey, labelKey) {
  return records.map((record) => ({ value: record[valueKey], label: record[labelKey] || record[valueKey] }));
}

export default function WmsPurchaseOrderForm() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [company, setCompany] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState(null);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");
  const minDate = new Date().toISOString().slice(0, 10);

  async function loadCompanies() {
    setCompaniesLoading(true);
    setCompaniesError("");
    try {
      const response = await fetch("/api/wms/companies?pageSize=100", { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to load Companies from ERPNext.");
      const records = payload.data?.records || [];
      setCompanies(records);
      if (records.length === 1) setCompany(records[0].name);
    } catch (error) {
      setCompaniesError(error.message || "Unable to load Companies from ERPNext.");
    } finally {
      setCompaniesLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/wms/suppliers?pageSize=100", { headers: authHeaders() })
      .then((r) => r.json().then((p) => ({ ok: r.ok, p })))
      .then(({ ok, p }) => { if (!ok) throw new Error(p.message || "Unable to load Suppliers."); setSuppliers(p.data?.records || []); })
      .catch((error) => setNotice((current) => current || { tone: "error", message: error.message || "Unable to load Suppliers from ERPNext." }));
    fetch("/api/wms/uoms?pageSize=100", { headers: authHeaders() })
      .then((r) => r.json().then((p) => ({ ok: r.ok, p })))
      .then(({ ok, p }) => { if (!ok) throw new Error(p.message || "Unable to load UOMs."); setUoms(p.data?.records || []); })
      .catch((error) => setNotice((current) => current || { tone: "error", message: error.message || "Unable to load UOMs from ERPNext." }));
    loadCompanies();
  }, []);

  // Warehouses belong to one ERPNext Company — re-scope the list whenever the
  // chosen Company changes, so a warehouse from another Company can't be picked.
  useEffect(() => {
    setWarehouse("");
    if (!company) { setWarehouses([]); return; }
    const query = new URLSearchParams({ pageSize: "100", company });
    fetch(`/api/wms/warehouses?${query}`, { headers: authHeaders() }).then((r) => r.json()).then((p) => setWarehouses(p.data?.records || [])).catch(() => {});
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ pageSize: "10", search: itemSearch });
      fetch(`/api/wms/items?${query}`, { headers: authHeaders() }).then((r) => r.json()).then((p) => setItemResults(p.data?.records || [])).catch(() => {});
    }, itemSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  function addLine(item) {
    setLines((current) => current.some((line) => line.itemCode === item.item_code) ? current : [...current, { id: item.item_code, itemCode: item.item_code, itemName: item.item_name, uom: item.stock_uom || "", qty: 1, rate: 0, warehouse: "" }]);
    setItemSearch("");
  }
  function updateLine(id, patch) { setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line))); }
  function removeLine(id) { setLines((current) => current.filter((line) => line.id !== id)); }

  const total = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
  // Company must be chosen/typed whenever the picker has more than one option,
  // or when the picker itself couldn't load (fallback to manual entry below).
  const companiesUnavailable = Boolean(companiesError) || (!companiesLoading && companies.length === 0);
  const needsCompanyInput = companies.length > 1 || companiesUnavailable;
  const canSave = Boolean(supplier) && Boolean(scheduleDate) && (!needsCompanyInput || Boolean(company)) && lines.length > 0 && lines.every((line) => Number(line.qty) > 0 && Number(line.rate) >= 0);

  async function save(shouldSubmit) {
    try {
      setSaving(shouldSubmit ? "submit" : "draft");
      setNotice(null);
      const response = await fetch("/api/wms/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          supplier,
          company,
          scheduleDate,
          warehouse,
          submit: shouldSubmit,
          lines: lines.map((line) => ({ itemCode: line.itemCode, qty: line.qty, uom: line.uom, rate: line.rate, warehouse: line.warehouse })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to save the Purchase Order.");
      router.push(`/wms/purchase-orders/${encodeURIComponent(payload.data.name)}`);
    } catch (error) {
      setNotice({ tone: "error", message: error.message || "Unable to save the Purchase Order." });
    } finally {
      setSaving("");
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
  const supplierOptions = asOptions(suppliers, "name", "supplier_name");
  const companyOptions = asOptions(companies, "name", "company_name");
  const warehouseOptions = asOptions(warehouses, "name", "warehouse_name");
  const uomOptions = asOptions(uoms, "name", "name");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Phase 2 · Procure to receive</p>
        <h1 className="mt-2 text-3xl font-bold">New Purchase Order</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Saves and submits directly against ERPNext's Purchase Order doctype. ERPNext remains the single source of truth for status and stock.</p>
      </section>
      {notice ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{notice.message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-bold">Purchase Order details</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Supplier
            <WmsSelect value={supplier} onChange={setSupplier} options={supplierOptions} placeholder="Search suppliers..." />
          </label>
          {companies.length > 1 ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Company
              <WmsSelect value={company} onChange={setCompany} options={companyOptions} placeholder="Select a company..." />
            </label>
          ) : null}
          {companiesUnavailable ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Company
              <input className={inputClass} value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Exact ERPNext Company name" />
              <span className="text-xs text-rose-600">{companiesError || "No Companies came back from ERPNext."} <button type="button" onClick={loadCompanies} className="font-semibold underline">Retry</button></span>
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Required by
            <input type="date" className={inputClass} min={minDate} value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Target warehouse (optional)
            <WmsSelect value={warehouse} onChange={setWarehouse} options={warehouseOptions} placeholder={company ? "Search warehouses..." : "Choose a company first"} disabled={!company} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-bold">Items</h2>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search item code or item name" className={inputClass} />
          {itemSearch || itemResults.length ? (
            <div className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl bg-white">
              {itemResults.map((item) => (
                <button type="button" key={item.item_code} onClick={() => addLine(item)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-left hover:bg-cyan-50">
                  <span><span className="block truncate text-sm font-semibold text-slate-900">{item.item_name}</span><span className="block truncate text-xs text-slate-500">{item.item_code} · {item.stock_uom || "UOM pending"}</span></span>
                  <span className="text-xs font-semibold text-cyan-700">Add</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {!lines.length ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">Search and add one or more items to begin.</p> : null}
          {lines.map((line) => (
            <div key={line.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_1fr_auto] md:items-center">
              <div><p className="font-semibold text-slate-900">{line.itemName}</p><p className="text-xs text-slate-500">{line.itemCode}</p></div>
              <input type="number" min="0.0001" step="0.0001" className={inputClass} value={line.qty} onChange={(event) => updateLine(line.id, { qty: event.target.value })} placeholder="Qty" />
              <WmsSelect value={line.uom} onChange={(value) => updateLine(line.id, { uom: value })} options={uomOptions} placeholder="UOM..." />
              <input type="number" min="0" step="0.01" className={inputClass} value={line.rate} onChange={(event) => updateLine(line.id, { rate: event.target.value })} placeholder="Rate" />
              <WmsSelect value={line.warehouse} onChange={(value) => updateLine(line.id, { warehouse: value })} options={warehouseOptions} placeholder="Use target warehouse" disabled={!company} />
              <button type="button" onClick={() => removeLine(line.id)} className="text-sm font-semibold text-rose-600">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-slate-500">Estimated total</p><p className="text-2xl font-bold text-slate-950">{money(total)}</p></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!canSave || Boolean(saving)} onClick={() => save(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">{saving === "draft" ? "Saving..." : "Save as draft"}</button>
            <button type="button" disabled={!canSave || Boolean(saving)} onClick={() => save(true)} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving === "submit" ? "Submitting..." : "Submit Purchase Order"}</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Submitting locks the Purchase Order in ERPNext and makes it available for GRN / receiving. A draft can be submitted later from the Purchase Order detail screen.</p>
      </section>
    </div>
  );
}
