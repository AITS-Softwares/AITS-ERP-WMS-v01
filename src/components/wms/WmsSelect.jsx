"use client";

import Select from "react-select";

const selectStyles = {
  container: (base) => ({ ...base, minWidth: 0, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 46,
    width: "100%",
    borderColor: state.isFocused ? "#0891b2" : "#cbd5e1",
    borderRadius: 12,
    boxShadow: state.isFocused ? "0 0 0 2px #cffafe" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    backgroundColor: state.isDisabled ? "#f8fafc" : "#fff",
    ":hover": { borderColor: state.isFocused ? "#0891b2" : "#94a3b8" },
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 14px", minWidth: 0 }),
  singleValue: (base) => ({ ...base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1f2937" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "#475569", padding: 10 }),
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  menu: (base) => ({ ...base, width: "100%", maxWidth: "calc(100vw - 2rem)", marginTop: 6, borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)" }),
  menuList: (base) => ({ ...base, maxHeight: 260, padding: 4 }),
  option: (base, state) => ({
    ...base,
    padding: "10px 12px",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.35,
    cursor: "pointer",
    backgroundColor: state.isSelected ? "#0891b2" : state.isFocused ? "#ecfeff" : "#fff",
    color: state.isSelected ? "#fff" : "#1f2937",
  }),
};

/** A searchable, mobile-safe select for WMS forms — type to filter long ERPNext lists. */
export default function WmsSelect({ value, onChange, options, placeholder = "Select an option", disabled = false, "aria-label": ariaLabel }) {
  const normalizedOptions = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value)) || null;

  return (
    <Select
      aria-label={ariaLabel || placeholder}
      className="w-full min-w-0"
      classNamePrefix="wms-select"
      options={normalizedOptions}
      value={selectedOption}
      onChange={(option) => onChange(option?.value || "")}
      isDisabled={disabled}
      isSearchable
      isClearable
      placeholder={placeholder}
      noOptionsMessage={() => "No matching options"}
      menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
      menuPosition="fixed"
      menuPlacement="auto"
      styles={selectStyles}
    />
  );
}
