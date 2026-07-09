import { useEffect } from "react";
import { createPortal } from "react-dom";
import ShowpieceNeon from "@/components/showpiece/ShowpieceNeon";

/**
 * Full-screen preview overlay of the Neon showpiece for a draft invoice.
 * Renders the canonical ShowpieceNeon (from components/showpiece) exactly as it
 * appears client-side. This is a preview only — the pay button is inert here.
 */
export default function ShowpieceOverlay({ invoice, business, onClose }) {
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#07080c",
        overflow: "auto",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10000,
          fontFamily: "'Courier New', monospace",
          fontSize: 12,
          color: "#ffffff",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          letterSpacing: "0.1em",
        }}
      >
        × CLOSE
      </button>
      <ShowpieceNeon invoice={invoice} business={business} onPay={() => {}} />
    </div>,
    document.body
  );
}