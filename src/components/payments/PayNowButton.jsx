import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { createCheckoutSession } from "@/functions/createCheckoutSession";

export default function PayNowButton({ invoice, size = "default", className = "" }) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayNow = async () => {
    setIsLoading(true);
    
    try {
      const response = await createCheckoutSession({
        invoiceId: invoice.id,
        successUrl: `${window.location.origin}/payment-success?invoice_id=${invoice.id}`,
        cancelUrl: `${window.location.origin}/invoice/${invoice.id}`,
      });

      if (response.data && response.data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if already paid
  if (invoice.status === 'paid' || invoice.payment_status === 'paid') {
    return null;
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
          Pay ${invoice.total_amount?.toFixed(2)}
          <ExternalLink className="w-3 h-3 ml-1" />
        </>
      )}
    </Button>
  );
}