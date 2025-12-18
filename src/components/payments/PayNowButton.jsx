import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { createCheckoutSession } from "@/functions/createCheckoutSession";

export default function PayNowButton({ invoice, invoiceId, amount, disabled, size = "default", className = "" }) {
  const [isLoading, setIsLoading] = useState(false);

  // Normalize props
  const id = invoiceId || invoice?.id;
  const totalAmount = amount || invoice?.total_amount || 0;
  const isPaid = disabled || invoice?.status === 'paid' || invoice?.payment_status === 'paid';

  const handlePayNow = async () => {
    setIsLoading(true);
    
    try {
      // Use the correct backend function signature
      const response = await createCheckoutSession({
        invoice_id: id,
        return_url: window.location.origin
      });

      if (response.data && response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        const errorMsg = response.data?.error || 'Failed to create checkout session';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert(`Failed to initiate payment: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if already paid
  if (isPaid) {
    return (
        <Button disabled size={size} className={`bg-slate-200 text-slate-500 cursor-not-allowed ${className}`}>
            Paid
        </Button>
    );
  }

  return (
    <Button
      onClick={handlePayNow}
      disabled={isLoading}
      size={size}
      className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay ${totalAmount?.toFixed(2)}
          <ExternalLink className="w-3 h-3 ml-1" />
        </>
      )}
    </Button>
  );
}