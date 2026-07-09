import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import ShowpieceNeon from "./ShowpieceNeon";

/**
 * Full-screen preview of the Neon showpiece for unsaved/parsed invoice data.
 * The pay button inside will only work once the invoice has a real id, which is
 * intended — this is a preview, nothing is sent or charged from here.
 */
export default function ShowpiecePreview({ invoiceData, companyInfo, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#07080c]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="fixed top-4 right-4 z-[110] w-11 h-11 rounded-full flex items-center justify-center bg-[#0d0f16] border border-[#1b1f2c] text-[#e8ecf4] hover:bg-[#151824] transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <ShowpieceNeon invoice={invoiceData} companyInfo={companyInfo} />
    </div>,
    document.body
  );
}