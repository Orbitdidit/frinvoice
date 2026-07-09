import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Invoice } from '@/entities/Invoice';
import { base44 } from '@/api/base44Client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  // Handle both snake_case (from backend) and camelCase (legacy)
  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId');
  const sessionId = searchParams.get('session_id');
  const [invoice, setInvoice] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      const initPage = async () => {
          // 1. If we have a session_id, verify the payment first
          if (sessionId) {
              setIsVerifying(true);
              try {
                  await base44.functions.invoke("verifyStripeSession", { 
                      invoice_id: invoiceId,
                      session_id: sessionId
                  });
              } catch (e) {
                  console.error("Verification failed", e);
              } finally {
                  setIsVerifying(false);
              }
          }

          // 2. Fetch Invoice Details
          try {
            const { data } = await base44.functions.invoke("getPublicInvoice", { invoice_id: invoiceId });
            if (data?.invoice) {
                setInvoice(data.invoice);
            } else {
                 const inv = await Invoice.get(invoiceId);
                 setInvoice(inv);
            }
        } catch (err) {
          console.error("Could not fetch invoice details:", err);
        }
      };
      initPage();
    }
  }, [invoiceId, sessionId]);
  
  return (
    <div className="min-h-screen bg-money-paper flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <div className="bg-card text-center rounded-md border-2 border-ink shadow-hard-lg overflow-hidden">
          <div className="bg-money text-white p-10 border-b-2 border-ink">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            >
              <CheckCircle className="w-20 h-20 mx-auto" />
            </motion.div>
            <h1 className="text-4xl font-heading font-extrabold mt-4">Payment Successful!</h1>
          </div>
          <div className="p-8 md:p-10 space-y-6">
            <p className="text-xl font-heading text-ink">
              Thank you for your payment! Your project is ready to move forward.
            </p>
            {invoice && (
              <div className="bg-paper p-4 rounded-md border-2 border-ink text-left font-mono">
                <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                <p><strong>Amount Paid:</strong> <span className="font-bold text-money">${invoice.total_amount.toFixed(2)}</span></p>
              </div>
            )}
            <p className="text-ink/60 font-mono text-sm">
              We've sent a receipt to your email. If you have any questions, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl(`PublicInvoice?id=${invoiceId}`)}>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Invoice
                </Button>
              </Link>
              <Link to="/">
                <Button variant="money" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}