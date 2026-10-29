"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { locationQrText } from "@/lib/wmsLocationQr";

export default function WmsLocationQr({ row }) {
  const text = locationQrText(row);
  const [image, setImage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setImage("");
    setError(false);
    QRCode.toDataURL(text, { width: 160, margin: 4, errorCorrectionLevel: "M" })
      .then((url) => { if (active) setImage(url); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [text]);

  return <figure className="inline-flex flex-col items-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
    {image ? <img src={image} width={160} height={160} alt={`Location QR code. ${text}`} /> : <div className="flex h-40 w-40 items-center justify-center text-center text-xs text-slate-500" role="status">{error ? "Unable to generate QR code" : "Generating QR code…"}</div>}
    <figcaption className="pb-1 text-xs font-medium text-slate-500">Scan for location details</figcaption>
  </figure>;
}
