
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  FileCheck, // For estimates
  ThumbsUp, // For accept
  ThumbsDown // For decline
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createCheckoutSession } from "@/functions/createCheckoutSession";
import { User } from "@/entities/User";
import { Invoice } from "@/entities/Invoice";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function ClientInvoiceView({ invoice: initialInvoice, onInvoiceUpdate }) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [invoice, setInvoice] = useState(initialInvoice);
  const isEstimate = invoice.document_type === 'estimate';

  useEffect(() => {
    loadCompanyInfo();
    // When the invoice is viewed by a client, update status to 'viewed' if it was 'sent'
    if (invoice.status === 'sent') {
      updateStatus('viewed');
    }
  }, [invoice.created_by, invoice.status]);

  const loadCompanyInfo = async () => {
    try {
      // Get the company info from the invoice creator
      const invoiceCreator = await User.filter({ email: invoice.created_by });
      if (invoiceCreator.length > 0) {
        console.log("Company info loaded:", invoiceCreator[0]); // Debug log
        setCompanyInfo(invoiceCreator[0]);
      } else {
        console.log("No company info found for:", invoice.created_by);
      }
    } catch (error) {
      console.error("Error loading company info:", error);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await Invoice.update(invoice.id, { status: newStatus });
      setInvoice(prev => ({ ...prev, status: newStatus }));
      if (onInvoiceUpdate) onInvoiceUpdate();
      toast.success(`Estimate has been marked as ${newStatus}.`);
    } catch (error) {
      console.error(`Failed to update status to ${newStatus}`, error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handlePayNow = async () => {
    setIsProcessingPayment(true);
    try {
      const { data } = await createCheckoutSession({
        invoiceId: invoice.id,
        successUrl: `${window.location.origin}${createPageUrl(`PaymentSuccess?invoiceId=${invoice.id}`)}`,
        cancelUrl: `${window.location.origin}${createPageUrl(`PublicInvoice?id=${invoice.id}`)}`
      });
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Payment failed to initialize:", error);
      alert("Payment failed to initialize. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const isPaid = invoice.status === 'paid' || invoice.payment_status === 'paid';
  const isEstimateAccepted = invoice.status === 'accepted';
  const isEstimateDeclined = invoice.status === 'declined';
  // The outline defines isEstimateActionable but doesn't use it. Keeping it as per outline for now.
  // const isEstimateActionable = isEstimate && (invoice.status === 'sent' || invoice.status === 'viewed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with Call to Action */}
      {!isPaid && !isEstimateAccepted && !isEstimateDeclined && (
        <div className={`text-white py-8 ${isEstimate ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {isEstimate ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold">Review Your Estimate</h1>
                  <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                    Please review the details below and let us know if you'd like to proceed.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <Button
                       onClick={() => updateStatus('accepted')}
                       size="lg"
                       className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
                     >
                       <ThumbsUp className="w-6 h-6 mr-2" />
                       Accept Estimate
                     </Button>
                     <Button
                       onClick={() => updateStatus('declined')}
                       size="lg"
                       variant="destructive"
                       className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
                     >
                       <ThumbsDown className="w-6 h-6 mr-2" />
                       Decline
                     </Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold">🚀 Ready to Get Started?</h1>
                  <p className="text-xl text-green-100 max-w-2xl mx-auto">
                    Your project is waiting! Complete your payment to begin this exciting journey.
                  </p>
                  <Button
                    onClick={handlePayNow}
                    disabled={isProcessingPayment}
                    size="lg"
                    className="bg-white text-green-600 hover:bg-green-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isProcessingPayment ? "Processing..." : (
                      <><DollarSign className="w-6 h-6 mr-2" />Pay ${invoice.total_amount.toFixed(2)} Now<ArrowRight className="w-5 h-5 ml-2" /></>
                    )}
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Company Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          {/* Better logo display */}
          {companyInfo?.company_logo_url && (
            <div className="flex justify-center">
              <img
                src={companyInfo.company_logo_url}
                alt={companyInfo.company_name || "Company logo"}
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  console.error("Client view logo failed to load:", companyInfo.company_logo_url);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log("Client view logo loaded successfully:", companyInfo.company_logo_url);
                }}
              />
            </div>
          )}
          {/* DEBUG: Show company info status */}
          {!companyInfo?.company_logo_url && companyInfo && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs mb-2">
                No Logo
              </div>
              <p className="text-xs text-gray-500">Company: {companyInfo.company_name || 'Not set'}</p>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {companyInfo?.company_name || `Professional ${isEstimate ? 'Estimate' : 'Invoice'}`}
            </h2>
            <p className="text-slate-600">#{invoice.invoice_number}</p>
          </div>
        </motion.div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge className={`px-6 py-2 text-lg ${
            isPaid ? 'bg-green-100 text-green-800 border-green-200' :
            isEstimateAccepted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
            isEstimateDeclined ? 'bg-red-100 text-red-800 border-red-200' :
            'bg-orange-100 text-orange-800 border-orange-200'
          }`}>
            {isPaid ? <><CheckCircle className="w-5 h-5 mr-2" />Paid - Thank You!</> :
             isEstimateAccepted ? <><FileCheck className="w-5 h-5 mr-2" />Estimate Accepted!</> :
             isEstimateDeclined ? <><ThumbsDown className="w-5 h-5 mr-2" />Estimate Declined</> :
             <><Clock className="w-5 h-5 mr-2" />{isEstimate ? 'Awaiting Response' : 'Payment Pending'}</>
            }
          </Badge>
        </div>

        {/* Showcase Image */}
        {invoice.project_hero_image_url && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg overflow-hidden shadow-lg"
          >
            <img 
              src={invoice.project_hero_image_url} 
              alt="Project Showcase" 
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </motion.div>
        )}

        {/* Invoice Details Card */}
        <Card className="shadow-lg">
          <CardHeader className={`text-white ${isEstimate ? 'bg-gradient-to-r from-cyan-800 to-blue-900' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
            <CardTitle className="text-2xl font-bold text-center">
              {isEstimate ? 'Estimate Details' : 'Invoice Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Bill To & Invoice Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">To:</h3>
                <p className="text-lg font-bold text-slate-900">{invoice.client_name}</p>
                <p className="text-slate-600">{invoice.client_email}</p>
              </div>
              <div className="md:text-right">
                <h3 className="font-semibold text-slate-800 mb-3">{isEstimate ? 'Estimate Information:' : 'Invoice Information:'}</h3>
                <div className="space-y-2">
                  <div className="flex md:justify-end items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>Issued: {format(new Date(invoice.invoice_date || invoice.created_date), 'MMM dd, yyyy')}</span>
                  </div>
                  {!isEstimate && (
                    <div className="flex md:justify-end items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span>Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-slate-800 text-lg">Services & Items:</h3>
              <div className="space-y-4">
                {invoice.line_items.filter(item => !item.is_discount).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt={item.description}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-900">{item.description}</h4>
                        <p className="text-slate-600 text-sm">{item.detail}</p>
                        <p className="text-slate-500 text-sm">
                          {item.quantity} × ${item.unit_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
              </div>
              
              {/* Discounts */}
              {invoice.line_items.filter(item => item.is_discount).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-600">{item.description}:</span>
                  <span className="text-green-600 font-semibold">-${Math.abs(item.total).toFixed(2)}</span>
                </div>
              ))}
              
              {/* Tax */}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tax ({invoice.tax_rate}%):</span>
                  <span className="font-semibold">${invoice.tax_amount.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              {/* Total */}
              <div className={`flex justify-between items-center py-4 px-6 rounded-lg text-white ${isEstimate ? 'bg-gradient-to-r from-cyan-800 to-blue-900' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
                <span className="text-xl font-bold">Total:</span>
                <span className="text-3xl font-bold flex items-center gap-2">
                  <DollarSign className="w-8 h-8" />
                  {invoice.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        {companyInfo?.payment_details && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Payment Instructions
              </h3>
              <div className="text-blue-800 whitespace-pre-wrap">
                {companyInfo.payment_details}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom Call to Action / Status Message */}
        {!isPaid && !isEstimateAccepted && !isEstimateDeclined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            {isEstimate ? (
               <>
                  <h3 className="text-2xl font-bold text-slate-800">Ready to proceed with this estimate?</h3>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Please accept the estimate above to move forward with the project.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <Button
                       onClick={() => updateStatus('accepted')}
                       size="lg"
                       className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
                     >
                       <ThumbsUp className="w-6 h-6 mr-2" />
                       Accept Estimate
                     </Button>
                     <Button
                       onClick={() => updateStatus('declined')}
                       size="lg"
                       variant="destructive"
                       className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
                     >
                       <ThumbsDown className="w-6 h-6 mr-2" />
                       Decline
                     </Button>
                  </div>
               </>
            ) : (
               <>
                  <h3 className="text-2xl font-bold text-slate-800">Ready to Begin Your Project?</h3>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Complete your payment securely below and we'll get started on your amazing project right away!
                  </p>
                  <Button
                    onClick={handlePayNow}
                    disabled={isProcessingPayment}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-4 text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isProcessingPayment ? "Processing..." : (
                      <><Sparkles className="w-6 h-6 mr-3" />Pay ${invoice.total_amount.toFixed(2)} & Start Project<ArrowRight className="w-6 h-6 ml-3" /></>
                    )}
                  </Button>
                  <p className="text-sm text-slate-500">🔒 Secure payment powered by Stripe</p>
               </>
            )}
          </motion.div>
        )}

        {/* Paid / Accepted / Declined Thank You Message */}
        {(isPaid || isEstimateAccepted || isEstimateDeclined) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            {isPaid && (
              <>
                <div className="text-6xl">🎉</div>
                <h3 className="text-3xl font-bold text-green-600">Thank You for Your Payment!</h3>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">Your payment has been successfully processed. We're excited to work with you and will be in touch soon!</p>
              </>
            )}
            {isEstimateAccepted && (
              <>
                <div className="text-6xl">👍</div>
                <h3 className="text-3xl font-bold text-emerald-600">Estimate Accepted!</h3>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">Thank you! We've received your approval and will be in touch shortly to finalize the details and begin the project.</p>
              </>
            )}
            {isEstimateDeclined && (
               <>
                <div className="text-6xl">😔</div>
                <h3 className="text-3xl font-bold text-red-600">Estimate Declined</h3>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">We've noted that you've declined this estimate. If you have any feedback or would like to discuss a different scope, please don't hesitate to reach out.</p>
               </>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>
            Need to create professional invoices like this? 
            <a href="https://invio.app" className="text-purple-600 hover:text-purple-700 font-medium ml-1">
              Try INVIO - Voice-Powered Invoicing
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
