import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-red-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <AlertTriangle className="w-16 h-16 mx-auto text-amber-500" />
            <CardTitle className="text-3xl font-bold mt-4">Payment Not Completed</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-slate-600">
              Your payment process was cancelled. You have not been charged.
            </p>
            <p className="text-slate-500 text-sm">
              If this was a mistake, you can go back and try again.
            </p>
            <Link to={createPageUrl(`PublicInvoice?id=${invoiceId}`)}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}