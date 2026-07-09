import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { createCheckoutSession } from "@/functions/createCheckoutSession";

/**
 * Skin-styled "Pay Securely" button wired to the existing Stripe checkout function.
 * `style` and `mutedColor` are provided per-skin so each skin gets its exact treatment.
 * `compact` renders a single full-width button (used in the mobile sticky bar).
 */
export default function SkinPayButton({ invoice, isPaid, style, mutedColor, compact = false }) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePay = async () => {
    setIsLoading(true);
    try {
      const response = await createCheckoutSession({
        invoice_id: invoice.id,
        return_url: window.location.origin,
      });
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data?.error || "Failed to create checkout session");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      alert(`Failed to initiate payment: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPaid) {
    if (compact) {
      return (
        <div
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md font-bold tracking-wide"
          style={{ border: `1px solid ${mutedColor}`, color: mutedColor }}
        >
          ✓ Payment received — thank you
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="inline-flex items-center gap-2 px-8 py-4 rounded-md font-bold tracking-wide"
          style={{ border: `1px solid ${mutedColor}`, color: mutedColor }}
        >
          ✓ Payment received — thank you
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handlePay}
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md font-bold text-base tracking-[0.06em] uppercase transition-transform active:translate-y-0.5 disabled:opacity-70"
        style={style}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay {invoice.total_amount ? `$${Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Securely"}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handlePay}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 px-12 py-5 rounded-md font-bold text-base tracking-[0.08em] uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
        style={style}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay Securely
          </>
        )}
      </button>
      <p className="flex items-center gap-1 text-xs" style={{ color: mutedColor }}>
        <Lock className="w-3 h-3" />
        Secure payment powered by Stripe
      </p>
    </div>
  );
}