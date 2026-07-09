import { useState, useEffect } from "react";
import { SendEmail } from "@/integrations/Core";
import { Invoice } from "@/entities/Invoice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { User } from "@/entities/User";

export default function SendEmailModal({ isOpen, onClose, invoice, invoiceUrl, presetSubject, presetBody }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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

    fetchUser();
  }, []);

  useEffect(() => {
    if (invoice && user) {
      const companyName = user.company_name || user.full_name;
      setTo(invoice.client_email || "");
      setSubject(presetSubject || `Invoice ${invoice.invoice_number} from ${companyName}`);
      setBody(presetBody || `Hello ${invoice.client_name || 'there'},

Here is your invoice ${invoice.invoice_number} for $${invoice.total_amount.toFixed(2)}.

You can view the invoice online at the link below:
${invoiceUrl}

Thank you for your business!

Best,
${companyName}`);
    }
  }, [invoice, invoiceUrl, user, isOpen, presetSubject, presetBody]);

  const handleSendEmail = async () => {
    if (!to || !subject || !body) {
      alert("Please fill in all fields.");
      return;
    }

    setIsSending(true);
    try {
      await SendEmail({
        to,
        subject,
        body,
        from_name: user?.company_name || user?.full_name || "INVOX",
      });

      // Update invoice status to 'sent'
      await Invoice.update(invoice.id, { status: "sent" });

      alert("Email sent successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] border-2 border-ink shadow-hard-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-ink">Send Invoice by Email</DialogTitle>
          <DialogDescription className="font-mono text-ink/60">
            Review the details below and click send. The invoice status will be updated to 'sent'.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="to" className="text-right">
              To
            </Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="body" className="text-right pt-2">
              Body
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="col-span-3"
              rows={10}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}