import { useState, useEffect } from "react";
import { SendEmail } from "@/integrations/Core";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Save, Loader2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function SendConfirmationModal({ isOpen, onClose, invoiceData, onSaveDraft }) {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  const handleSendEmail = async () => {
    if (!invoiceData.client_email || !user) return;
    
    setIsSending(true);
    try {
      const companyName = user.company_name || user.full_name;
      const invoiceUrl = `${window.location.origin}${createPageUrl(`InvoiceDetail?id=${invoiceData.id}`)}`;
      const emailBody = `Hello ${invoiceData.client_name || 'there'},

Here is your invoice ${invoiceData.invoice_number} for $${invoiceData.total_amount.toFixed(2)}.

You can view the invoice online at the link below:
${invoiceUrl}

Thank you for your business!

Best,
${companyName}`;

      // First, save the invoice to get an ID
      const savedInvoice = await Invoice.create({ ...invoiceData, status: "sent" });

      await SendEmail({
        to: invoiceData.client_email,
        subject: `Invoice ${invoiceData.invoice_number} from ${companyName}`,
        body: emailBody.replace(invoiceData.id, savedInvoice.id), // Ensure URL has the correct ID
        from_name: companyName,
      });

      alert("Invoice sent successfully!");
      navigate(createPageUrl(`InvoiceDetail?id=${savedInvoice.id}`));

    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. The invoice was saved as a draft.");
    } finally {
      setIsSending(false);
      onClose();
    }
  };
  
  const handleSaveDraft = async () => {
    await onSaveDraft();
    onClose();
  }

  if (!invoiceData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-2 border-ink shadow-hard-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading font-extrabold text-ink">Invoice Generated for {invoiceData.client_name}</DialogTitle>
          <DialogDescription className="font-mono text-ink/60">
            Would you like to send it now, or save it as a draft?
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 flex flex-col gap-4">
          <Button
            onClick={handleSendEmail}
            disabled={!invoiceData.client_email || isSending}
            size="lg"
            variant="money"
          >
            {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Send className="mr-2 h-4 w-4" />
            )}
            Send via Email
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    disabled
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send via Text (Coming Soon)
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>This feature requires a backend integration like Twilio.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>
        <DialogFooter className="flex-row !justify-between">
            <Button variant="ghost" onClick={onClose} disabled={isSending}>
                <XCircle className="mr-2 h-4 w-4" />
                Edit First
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSending}>
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}