"use client";

export default function PrintVendorQrButton() {
  return (
    <button type="button" onClick={() => window.print()} className="gv-primary-button print:hidden">
      Print QR card
    </button>
  );
}
