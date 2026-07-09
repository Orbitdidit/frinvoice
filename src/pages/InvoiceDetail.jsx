import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
import InvoiceViewer from "../components/invoices/InvoiceViewer";
import SendEmailModal from "../components/invoices/SendEmailModal";
import ClientInvoiceView from "../components/invoices/ClientInvoiceView";
import { Loader2, Send, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import { toast } from "@/components/ui/use-toast";

export default function InvoiceDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invoiceId = searchParams.get("id");
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginAndLoad = async () => {
      // Check if user is logged in
      try {
        await User.me();
        setIsLoggedIn(true);
      } catch (e) {
        setIsLoggedIn(false);
      }

      if (invoiceId) {
        loadInvoice();
      } else {
        if (isLoggedIn) {
          navigate(createPageUrl("Invoices"));
        } else {
          setError("No invoice specified.");
          setIsLoading(false);
        }
      }
    };

    checkLoginAndLoad();
  }, [invoiceId, navigate]);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await Invoice.get(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      setError("Invoice not found or inaccessible.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPublicInvoiceUrl = () => {
    // FIXED: Generate the PUBLIC invoice URL, not the business owner URL
    return `${window.location.origin}${createPageUrl(`PublicInvoice?id=${invoiceId}`)}`;
  };

  const handleCopyShowpieceLink = async () => {
    await navigator.clipboard.writeText(getPublicInvoiceUrl());
    toast({ title: "Link copied — send it and get paid 💸" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-money-paper">
        <Loader2 className="w-10 h-10 animate-spin text-money" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  // If user is NOT logged in, show the client view
  if (!isLoggedIn) {
    return <ClientInvoiceView invoice={invoice} onInvoiceUpdate={loadInvoice} />;
  }

  // If user IS logged in, show the business owner view
  return (
    <div className="min-h-screen bg-money-paper p-4 md:p-6 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Send & Share Section - ONLY for logged-in users */}
        {isLoggedIn && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Send & Share</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={() => setShowEmailModal(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Send by Email
                  </Button>
                  
                  <Button 
                    variant="money" 
                    onClick={handleCopyShowpieceLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy showpiece link
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open(getPublicInvoiceUrl(), "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview as client
                  </Button>
              </div>
              
              <Alert className="bg-money/10 border-2 border-money shadow-hard-sm mt-4">
                <CheckCircle className="h-4 w-4 text-money" />
                <AlertTitle className="text-ink font-semibold flex items-center gap-2">
                  🎉 Ready to get paid!
                </AlertTitle>
                <AlertDescription className="text-ink-soft">
                  Send the link to your client. They can view and pay the invoice instantly - no login required!
                </AlertDescription>
              </Alert>

            </CardContent>
          </Card>
        )}

        {/* Business Owner Invoice View */}
        <InvoiceViewer
          invoice={invoice}
          onInvoiceUpdate={loadInvoice}
          showEditButton={true}
          showPayButton={false}
        />
      </div>

      {isLoggedIn && invoice && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          invoice={invoice}
          invoiceUrl={getPublicInvoiceUrl()}
        />
      )}
    </div>
  );
}