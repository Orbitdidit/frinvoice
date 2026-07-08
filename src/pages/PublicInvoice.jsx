import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, AlertCircle, Loader2, Printer, Download, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import PayNowButton from "@/components/payments/PayNowButton";

const SKINS = {
  ledger: {
    page: "bg-stone-100",
    surface: "bg-white",
    border: "border-slate-300",
    text: "text-slate-900",
    muted: "text-slate-500",
    label: "text-slate-500",
    totalBg: "bg-slate-900",
    totalText: "text-white",
    payBtn: "bg-green-600 hover:bg-green-700 text-white",
    accent: "text-green-700",
    font: "font-sans",
    hero: "text-slate-900",
  },
  neon: {
    page: "bg-[#07080c]",
    surface: "bg-[#0d0f15] border-[#1a1d27]",
    border: "border-[#1a1d27]",
    text: "text-slate-100",
    muted: "text-slate-400",
    label: "text-[#3ee6ff]",
    totalBg: "bg-[#07080c] border border-[#3ee6ff]/40",
    totalText: "text-[#3ee6ff]",
    payBtn: "bg-[#3ee6ff] hover:bg-[#5af0ff] text-[#07080c] shadow-[0_0_30px_rgba(62,230,255,0.5)]",
    accent: "text-[#3ee6ff]",
    font: "font-mono",
    hero: "text-[#3ee6ff]",
  },
  luxe: {
    page: "bg-[#141210]",
    surface: "bg-[#1c1916] border-[#2a2620]",
    border: "border-[#2a2620]",
    text: "text-stone-100",
    muted: "text-stone-400",
    label: "text-[#c9a860]",
    totalBg: "bg-[#0d0c0a] border border-[#c9a860]/30",
    totalText: "text-[#c9a860]",
    payBtn: "bg-[#c9a860] hover:bg-[#d9b870] text-[#141210]",
    accent: "text-[#c9a860]",
    font: "font-serif",
    hero: "text-[#c9a860]",
  },
};

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return format(new Date(d + "T12:00:00"), "MMM dd, yyyy");
  } catch {
    return d;
  }
}

function projectTitle(invoice) {
  const first = invoice.line_items?.find((i) => !i.is_discount) || invoice.line_items?.[0];
  return first?.description || invoice.notes?.split("\n")[0] || "Professional Services";
}

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

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Loader2 className="w-12 h-12 animate-spin text-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <Card className="w-full max-w-md text-center border-slate-300">
          <CardContent className="p-8">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-600" />
            <p className="font-semibold text-slate-900">Couldn't load invoice</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const skinKey = invoice.skin || "ledger";
  const skin = SKINS[skinKey] || SKINS.ledger;
  const isPaid = invoice.status === "paid" || invoice.payment_status === "paid";

  return (
    <div className={`min-h-screen ${skin.page} ${skin.font} p-4 sm:p-8 transition-colors`}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Neon animated grid hero */}
      {skinKey === "neon" && (
        <div className="no-print max-w-4xl mx-auto mb-4 h-28 overflow-hidden rounded-xl border border-[#1a1d27] bg-[#07080c] relative">
          <div className="absolute inset-0 grid grid-cols-12 gap-px p-1">
            {Array.from({ length: 72 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#3ee6ff]/10 rounded-[2px]"
                style={{
                  animation: `neonPulse 2.5s ease-in-out ${((i * 37) % 100) / 50}s infinite`,
                }}
              />
            ))}
          </div>
          <style>{`@keyframes neonPulse { 0%,100% { opacity: 0.15; box-shadow: none; } 50% { opacity: 0.9; box-shadow: 0 0 8px rgba(62,230,255,0.8); } }`}</style>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action bar */}
        <div className="flex justify-between items-center no-print flex-wrap gap-2">
          <h2 className={`text-lg font-semibold ${skin.text}`}>Invoice {invoice.invoice_number}</h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className={`md:hidden border-${skin.border}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Save PDF
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className={`hidden md:flex border-${skin.border}`}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Invoice card */}
        <div className={`rounded-2xl border-2 ${skin.border} ${skin.surface} overflow-hidden`}>
          {/* Header */}
          <div className={`p-6 md:p-10 border-b-2 ${skin.border}`}>
            <div className="flex justify-between items-start gap-6 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold tracking-[0.2em] uppercase ${skin.label}`}>
                  {invoice.document_type === "estimate" ? "Estimate" : "Invoice"}
                </p>
                <h1 className={`mt-2 text-3xl md:text-5xl font-bold leading-tight ${skin.hero}`}>
                  {projectTitle(invoice)}
                </h1>
                {companyInfo?.company_name && (
                  <p className={`mt-2 text-sm ${skin.muted}`}>from {companyInfo.company_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold uppercase tracking-wider ${skin.label}`}>Invoice #</p>
                <p className={`font-mono font-bold text-lg ${skin.text}`}>{invoice.invoice_number || "—"}</p>
                {invoice.po_number && (
                  <>
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-wider ${skin.label}`}>PO #</p>
                    <p className={`font-mono font-bold ${skin.text}`}>{invoice.po_number}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill To + Dates */}
          <div className={`p-6 md:p-10 grid md:grid-cols-2 gap-8 border-b-2 ${skin.border}`}>
            <div>
              <p className={`text-xs font-bold tracking-[0.15em] uppercase ${skin.label}`}>Bill To</p>
              <p className={`mt-2 text-lg font-bold ${skin.text}`}>{invoice.client_name || "—"}</p>
              {invoice.client_contact_person && (
                <p className={`text-sm ${skin.muted}`}>Attn: {invoice.client_contact_person}</p>
              )}
              {invoice.client_email && (
                <p className={`text-sm ${skin.muted}`}>{invoice.client_email}</p>
              )}
              {invoice.client_address && (
                <p className={`text-sm ${skin.muted} whitespace-pre-line`}>{invoice.client_address}</p>
              )}
            </div>
            <div className="md:text-right">
              <p className={`text-xs font-bold tracking-[0.15em] uppercase ${skin.label}`}>Details</p>
              <dl className={`mt-2 space-y-1 text-sm ${skin.text}`}>
                <div className="flex md:justify-end gap-2">
                  <dt className={skin.muted}>Issued:</dt>
                  <dd className="font-medium">{formatDate(invoice.invoice_date)}</dd>
                </div>
                <div className="flex md:justify-end gap-2">
                  <dt className={skin.muted}>Due:</dt>
                  <dd className="font-medium">{formatDate(invoice.due_date)}</dd>
                </div>
                <div className="flex md:justify-end gap-2 items-center">
                  <dt className={skin.muted}>Status:</dt>
                  <dd>
                    <StatusBadge status={invoice.status} skin={skinKey} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Hero image */}
          {invoice.project_hero_image_url && (
            <div className={`px-6 md:px-10 pt-8`}>
              <img
                src={invoice.project_hero_image_url}
                alt="Project showcase"
                className="w-full h-auto rounded-lg object-cover max-h-80"
              />
            </div>
          )}

          {/* Line items */}
          <div className="p-6 md:p-10">
            <p className={`text-xs font-bold tracking-[0.15em] uppercase ${skin.label} mb-4`}>Line Items</p>
            <div className="space-y-2">
              {(invoice.line_items || []).map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between gap-4 py-3 border-b ${skin.border} ${
                    item.is_discount ? "opacity-80" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${skin.text}`}>{item.description || "—"}</p>
                    {item.detail && (
                      <p className={`text-sm ${skin.muted} mt-0.5 whitespace-pre-line`}>{item.detail}</p>
                    )}
                    {!item.is_discount && item.quantity > 1 && (
                      <p className={`text-xs ${skin.muted} mt-1`}>
                        {item.quantity} × {formatMoney(item.unit_price)}
                      </p>
                    )}
                  </div>
                  <p className={`font-mono font-bold ${item.is_discount ? "text-red-500" : skin.text} flex-shrink-0`}>
                    {item.is_discount ? "-" : ""}${formatMoney(Math.abs(item.total || 0))}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-full md:w-80 space-y-2">
                <div className={`flex justify-between py-2 text-sm ${skin.muted}`}>
                  <span>Subtotal</span>
                  <span className="font-mono">{formatMoney(invoice.subtotal)}</span>
                </div>
                {(invoice.discount_amount || 0) > 0 && (
                  <div className={`flex justify-between py-2 text-sm ${skin.muted}`}>
                    <span>Discounts</span>
                    <span className="font-mono">-{formatMoney(invoice.discount_amount)}</span>
                  </div>
                )}
                {(invoice.tax_amount || 0) > 0 && (
                  <div className={`flex justify-between py-2 text-sm ${skin.muted}`}>
                    <span>Tax ({invoice.tax_rate || 0}%)</span>
                    <span className="font-mono">{formatMoney(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center py-5 px-5 rounded-xl mt-2 ${skin.totalBg}`}>
                  <span className={`text-sm font-bold tracking-[0.15em] uppercase ${skin.totalText}`}>Total Due</span>
                  <span className={`text-2xl md:text-4xl font-bold font-mono ${skin.totalText}`}>
                    ${formatMoney(invoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay button */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {isPaid ? (
                <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 ${skin.border} ${skin.text}`}>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-semibold">Payment received — thank you</span>
                </div>
              ) : (
                <PayNowButton
                  invoiceId={invoice.id}
                  amount={invoice.total_amount}
                  disabled={isPaid}
                  size="lg"
                  className={`${skin.payBtn} px-10 py-6 text-base font-bold rounded-xl`}
                />
              )}
              <p className={`text-xs ${skin.muted} flex items-center gap-1`}>
                <Lock className="w-3 h-3" />
                Secure payment powered by Stripe
              </p>
            </div>

            {/* Notes + payment instructions */}
            <div className={`mt-10 pt-8 border-t-2 ${skin.border} grid md:grid-cols-2 gap-6`}>
              {invoice.notes && (
                <div>
                  <p className={`text-xs font-bold tracking-[0.15em] uppercase ${skin.label} mb-2`}>Notes & Terms</p>
                  <p className={`text-sm ${skin.muted} whitespace-pre-wrap`}>{invoice.notes}</p>
                </div>
              )}
              {companyInfo?.payment_details && (
                <div>
                  <p className={`text-xs font-bold tracking-[0.15em] uppercase ${skin.label} mb-2`}>Payment Instructions</p>
                  <p className={`text-sm ${skin.muted} whitespace-pre-wrap`}>{companyInfo.payment_details}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className={`text-center text-xs ${skin.muted} no-print`}>
          <p>Powered by INVIO</p>
          {companyInfo && <p>&copy; {new Date().getFullYear()} {companyInfo.company_name}. All rights reserved.</p>}
        </footer>
      </div>
    </div>
  );
}

function StatusBadge({ status, skin }) {
  const isPaid = status === "paid";
  const isOverdue = status === "overdue";
  const text = isPaid ? "Paid" : isOverdue ? "Overdue" : "Awaiting Payment";
  const Icon = isPaid ? CheckCircle : isOverdue ? AlertCircle : Clock;

  const color =
    isPaid
      ? "text-green-600 border-green-600"
      : isOverdue
      ? "text-red-600 border-red-600"
      : skin === "neon"
      ? "text-[#3ee6ff] border-[#3ee6ff]"
      : skin === "luxe"
      ? "text-[#c9a860] border-[#c9a860]"
      : "text-slate-600 border-slate-400";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 rounded-md text-xs font-bold uppercase tracking-wider ${color}`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}