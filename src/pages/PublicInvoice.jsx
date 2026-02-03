import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Printer,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PayNowButton from "../components/payments/PayNowButton";

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
        // Use backend function to fetch data securely without requiring login
        // We catch the error here to prevent the UI from crashing or redirecting
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
          // If the backend returned a 200 OK but with an error field, or just no invoice
          throw new Error(data?.error || "Invoice not found");
        }
      } catch (err) {
        console.error("Error loading public invoice:", err);
        // If it's a 404 or 500, we show the error message.
        // Important: Ensure we don't trigger a redirect loop if the user is not logged in.
        // Since we are in PublicInvoice, we just show the error state.
        setError(err.message || "Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // On mobile, trigger print which opens native save/share dialog
    window.print();
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "paid":
        return {
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle className="w-5 h-5" />,
          text: "Paid",
        };
      case "overdue":
        return {
          color: "bg-red-100 text-red-800",
          icon: <AlertCircle className="w-5 h-5" />,
          text: "Overdue",
        };
      default:
        return {
          color: "bg-blue-100 text-blue-800",
          icon: <Clock className="w-5 h-5" />,
          text: "Awaiting Payment",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClassic = invoice.template === "classic";
  const statusInfo = getStatusInfo(invoice.status);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex justify-between items-center no-print flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-slate-700">Invoice {invoice.invoice_number}</h2>
          <div className="flex gap-2 flex-wrap">
            <PayNowButton invoiceId={invoice.id} amount={invoice.total_amount} disabled={invoice.status === 'paid'} />
            
            {/* Mobile: Download PDF */}
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              className="md:hidden"
            >
              <Download className="w-4 h-4 mr-2" />
              Save PDF
            </Button>

            {/* Desktop: Print / Save PDF */}
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="hidden md:flex"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>
        
        {/* Invoice Card */}
        <Card className={`shadow-lg transition-all duration-500 ${isClassic ? 'font-serif' : 'font-sans'}`}>
          <CardHeader className={`relative overflow-hidden transition-all duration-500 ${isClassic ? 'bg-white border-b-2 border-black' : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white'}`}>
             {/* ... header content ... */}
          </CardHeader>

          <CardContent className="p-3 md:p-8">
            {/* ... Client & Date Info ... */}

            {/* Project Hero Image */}
            {invoice.project_hero_image_url && (
                <div className="my-8 rounded-lg overflow-hidden shadow-lg">
                    <img 
                        src={invoice.project_hero_image_url} 
                        alt="Project showcase" 
                        className="w-full h-auto object-cover"
                    />
                </div>
            )}

            {/* ... Line Items Table ... */}
            {/* ... Totals Section ... */}

            <div className="grid md:grid-cols-2 gap-8 mt-8 pt-8 border-t">
              {/* Notes */}
              <div>
                <h4 className="text-lg font-semibold mb-2">Notes</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes || "Thank you for your business."}</p>
              </div>

              {/* Payment Instructions */}
              {companyInfo?.payment_details && (
                <div>
                  <h4 className="text-lg font-semibold mb-2">Payment Instructions</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">{companyInfo.payment_details}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-slate-500 no-print">
          <p>Powered by INVIO</p>
          {companyInfo && <p>&copy; {new Date().getFullYear()} {companyInfo.company_name}. All rights reserved.</p>}
        </footer>
      </div>
    </div>
  );
}