import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Loader2 } from "lucide-react";
import LedgerSkin from "@/components/public-invoice/LedgerSkin";
import NeonSkin from "@/components/public-invoice/NeonSkin";
import LuxeSkin from "@/components/public-invoice/LuxeSkin";

const SKIN_COMPONENTS = {
  ledger: LedgerSkin,
  neon: NeonSkin,
  luxe: LuxeSkin,
};

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

  return <SkinComponent invoice={invoice} companyInfo={companyInfo} />;
}