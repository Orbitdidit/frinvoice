import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Loader2 } from "lucide-react";
import LedgerSkin from "@/components/public-invoice/LedgerSkin";
import LuxeSkin from "@/components/public-invoice/LuxeSkin";
import ShowpieceNeon from "@/components/invoices/ShowpieceNeon";
import SkinPayButton from "@/components/public-invoice/SkinPayButton";
import { SKIN_PAY_THEME, isPaidStatus } from "@/components/public-invoice/helpers";

const SKIN_COMPONENTS = {
  ledger: LedgerSkin,
  neon: ShowpieceNeon,
  luxe: LuxeSkin,
};

/* Clean print output on white, regardless of skin. */
const PRINT_CSS = `
  @media print {
    @page { margin: 14mm; }
    html, body { background: #fff !important; }
    .invoice-public-root, .invoice-public-root * {
      background: #fff !important;
      color: #17150f !important;
      box-shadow: none !important;
      text-shadow: none !important;
      border-color: #d9d4c7 !important;
    }
    .invoice-public-root img { filter: none !important; }
    /* Hide interactive chrome: pay button, sticky bar, secure notice */
    .no-print { display: none !important; }
  }
`;

export default function PublicInvoice() {
  const [invoice, setInvoice] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("id");

  useEffect(() => {
    if (!invoiceId) {
      setError("No invoice ID provided.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        let response;
        try {
          response = await base44.functions.invoke("getPublicInvoice", { invoice_id: invoiceId });
        } catch (invokeError) {
          console.error("Invoke error:", invokeError);
          throw new Error("Network error loading invoice. Please refresh.");
        }

        const { data } = response;
        if (data && data.invoice) {
          setInvoice(data.invoice);
          setCompanyInfo(data.companyInfo);
        } else {
          throw new Error(data?.error || "Invoice not found");
        }
      } catch (err) {
        console.error("Error loading public invoice:", err);
        setError(err.message || "Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080c]">
        <Loader2 className="w-12 h-12 animate-spin text-[#3ee6ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080c] p-4">
        <div className="w-full max-w-md text-center rounded-lg border border-[#1b1f2c] bg-[#0d0f16] p-8">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-slate-100">Couldn't load invoice</p>
          <p className="text-sm text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const skinKey = invoice.skin || "ledger";
  const SkinComponent = SKIN_COMPONENTS[skinKey] || LedgerSkin;
  const theme = SKIN_PAY_THEME[skinKey] || SKIN_PAY_THEME.ledger;
  const isPaid = isPaidStatus(invoice);
  // The Neon showpiece renders its own full-width pay button, so it doesn't need the shared sticky bar.
  const showStickyBar = skinKey !== "neon";

  return (
    <div className="invoice-public-root relative">
      <style>{PRINT_CSS}</style>

      {/* On mobile, add bottom padding so the sticky pay bar never covers content. */}
      <div className={isPaid || !showStickyBar ? "" : "pb-24 md:pb-0"}>
        <SkinComponent invoice={invoice} companyInfo={companyInfo} />
      </div>

      {/* Mobile sticky pay bar — full-width, safe-area padded, hidden on desktop & print. */}
      {showStickyBar && !isPaid && (
        <div
          className="no-print fixed bottom-0 left-0 right-0 z-40 md:hidden border-t px-4 pt-3"
          style={{
            background: theme.bar,
            borderColor: theme.barBorder,
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            boxShadow: "0 -8px 24px rgba(0,0,0,.18)",
          }}
        >
          <SkinPayButton invoice={invoice} isPaid={isPaid} style={theme.style} mutedColor={theme.muted} compact />
        </div>
      )}
    </div>
  );
}