import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id') || searchParams.get('invoiceId');

  return (
    <div className="min-h-screen bg-money-paper flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card text-center rounded-md border-2 border-ink shadow-hard-lg overflow-hidden">
          <div className="p-8 pb-0">
            <AlertTriangle className="w-16 h-16 mx-auto text-stamp" />
            <h1 className="text-3xl font-heading font-extrabold text-ink mt-4">Payment Not Completed</h1>
          </div>
          <div className="p-8 space-y-6">
            <p className="text-ink font-heading">
              Your payment process was cancelled. You have not been charged.
            </p>
            <p className="text-ink/60 font-mono text-sm">
              If this was a mistake, you can go back and try again.
            </p>
            <Link to={createPageUrl(`PublicInvoice?id=${invoiceId}`)}>
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Invoice
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}