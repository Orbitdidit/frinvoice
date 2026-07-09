import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import InvoiceEditor from "../components/invoices/InvoiceEditor";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/utils";

export default function EditInvoice() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invoiceId = searchParams.get("id");
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    } else {
      setError("No invoice ID provided");
      setIsLoading(false);
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await Invoice.get(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      setError("Failed to load invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedInvoiceData) => {
    try {
      // Check if client exists and create if needed
      if (updatedInvoiceData.client_name) {
        const existingClient = await Client.filter({ 
          name: updatedInvoiceData.client_name
        });

        if (existingClient.length === 0) {
          await Client.create({
            name: updatedInvoiceData.client_name,
            email: updatedInvoiceData.client_email || ''
          });
        }
      }

      // Update the invoice
      await Invoice.update(invoiceId, updatedInvoiceData);
      navigate(createPageUrl(`InvoiceDetail?id=${invoiceId}`));
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice. Please try again.");
    }
  };

  const handleCancel = () => {
    navigate(createPageUrl(`InvoiceDetail?id=${invoiceId}`));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-money-paper">
        <Loader2 className="w-10 h-10 animate-spin text-money" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-money-paper p-6">
        <div className="max-w-5xl mx-auto rounded-md border-2 border-stamp bg-stamp/10 p-6">
          <h2 className="font-heading font-bold text-stamp mb-2">Error</h2>
          <p className="font-mono text-sm text-ink">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-money-paper p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-money">Edit</p>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-ink">Edit Invoice</h1>
          <p className="text-ink/60 font-mono text-sm mt-1">Make changes to your invoice below</p>
        </div>
        
        {invoice && (
          <InvoiceEditor
            invoiceData={invoice}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={true}
            isNew={false}
          />
        )}
      </div>
    </div>
  );
}