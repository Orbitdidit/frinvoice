import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
// This import is not used in the provided code, but preserved as it was in the original.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  ArrowLeft,
  Send,
  Download,
  CheckCircle,
  Edit,
  Eye,
  EyeOff,
  Wallet,
  AlertCircle,
  RefreshCw, // For convert button
  FileCheck, // For estimate accepted status
  Loader2, // For loading spinner on convert
  X // For declined status
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCarousel from "./ImageCarousel";
import { toast } from 'sonner';

export default function InvoiceViewer({ invoice: invoiceProp, onInvoiceUpdate, showEditButton = true, showPayButton = false }) {
  const navigate = useNavigate();
  // Initialize state from the `invoiceProp`
  const [invoice, setInvoice] = useState(invoiceProp);
  const [template, setTemplate] = useState(invoiceProp.template || 'modern');
  const [carouselImages, setCarouselImages] = useState([]);
  const [showCarousel, setShowCarousel] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [userCompany, setUserCompany] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const isClassic = template === 'classic';
  const isEstimate = invoice.document_type === 'estimate';

  // Pre-filter line items for discounts and deposits to optimize rendering
  const generalDiscounts = invoice.line_items.filter(item =>
    item.is_discount &&
    !item.description.toLowerCase().includes('deposit') &&
    !item.description.toLowerCase().includes('down payment')
  );

  const deposits = invoice.line_items.filter(item =>
    item.is_discount &&
    (item.description.toLowerCase().includes('deposit') ||
     item.description.toLowerCase().includes('down payment'))
  );

  // Reset preview mode when component mounts
  useEffect(() => {
    setPreviewMode(false);
  }, []);

  useEffect(() => {
    loadUserCompanyInfo();
  }, []);

  const loadUserCompanyInfo = async () => {
    try {
      const user = await User.me();
      console.log("User company data:", user); // Debug log
      setUserCompany(user);
    } catch (error) {
      console.error("Error loading user company info:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    
    // Optimistic update
    const previousStatus = invoice.status;
    const updatedInvoice = {
      ...invoice,
      status: newStatus,
      payment_status: !isEstimate && newStatus === 'paid' ? 'paid' : invoice.payment_status 
    };
    setInvoice(updatedInvoice);
    
    try {
      await Invoice.update(invoice.id, updatedInvoice);

      if (onInvoiceUpdate) {
        onInvoiceUpdate();
      }

      toast.success(`${isEstimate ? 'Estimate' : 'Invoice'} status updated to ${newStatus}`);
    } catch (error) {
      // Revert on error
      setInvoice({ ...invoice, status: previousStatus });
      console.error("Error updating status:", error);
      toast.error(`Failed to update ${isEstimate ? 'estimate' : 'invoice'} status. Please try again.`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleConvertToInvoice = async () => {
    setIsConverting(true);
    try {
      const newInvoiceData = {
        ...invoice,
        document_type: 'invoice',
        status: 'draft', // Reset status to draft for the new invoice
        invoice_date: new Date().toISOString().split('T')[0], // Reset issue date to today
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Set due date 30 days from now
      };
      
      const newInvoice = await Invoice.create(newInvoiceData);
      toast.success("Estimate successfully converted to a new invoice!");
      navigate(createPageUrl(`InvoiceDetail?id=${newInvoice.id}`));

    } catch (error) {
      console.error("Error converting to invoice:", error);
      toast.error("Failed to convert to invoice.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('invoice-print-root');
    if (!element) {
      toast.error('Could not find invoice content to export.');
      return;
    }

    const toastId = toast.loading('Generating PDF...');

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      element.classList.add('pdf-export-mode');

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      element.classList.remove('pdf-export-mode');

      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const ratio = contentWidth / canvas.width;
      const scaledFullHeight = canvas.height * ratio;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
        compress: true,
      });

      if (scaledFullHeight <= contentHeight) {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, scaledFullHeight, undefined, 'FAST');
      } else {
        const pageCanvasHeight = contentHeight / ratio;
        let renderedHeight = 0;
        let pageNum = 0;

        while (renderedHeight < canvas.height) {
          const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

          const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          if (pageNum > 0) pdf.addPage();
          pdf.addImage(sliceImgData, 'JPEG', margin, margin, contentWidth, sliceHeight * ratio, undefined, 'FAST');

          renderedHeight += sliceHeight;
          pageNum++;
        }
      }

      const docType = isEstimate ? 'Estimate' : 'Invoice';
      const fileName = `${docType}-${invoice.invoice_number || 'document'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed. Try again.', { id: toastId });
      const el = document.getElementById('invoice-print-root');
      if (el) el.classList.remove('pdf-export-mode');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'declined': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'accepted': return <FileCheck className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'viewed': return <Eye className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'declined': return <X className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const openImageCarousel = (images) => {
    setCarouselImages(images);
    setShowCarousel(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <style>{`
        .pdf-export-mode,
        .pdf-export-mode * {
          color: #0f172a !important;
        }
        .pdf-export-mode {
          background: #ffffff !important;
          box-shadow: none !important;
        }
        .pdf-export-mode .print-header-modern,
        .pdf-export-mode .print-total-modern {
          background: linear-gradient(to right, #1e293b, #334155) !important;
        }
        .pdf-export-mode .print-header-modern *,
        .pdf-export-mode .print-total-modern * {
          color: #ffffff !important;
        }
        .pdf-export-mode input,
        .pdf-export-mode textarea {
          background: transparent !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }

        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }

          /* Hide all non-invoice UI */
          body > * {
            display: none !important;
          }

          /* Show only the invoice card */
          #invoice-print-root,
          #invoice-print-root * {
            display: revert !important;
            visibility: visible !important;
          }

          #invoice-print-root {
            position: fixed;
            inset: 0;
            overflow: visible;
          }

          /* Remove card chrome for print */
          #invoice-viewer-content {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }

          /* Allow content to break across pages naturally */
          #invoice-viewer-content * {
            overflow: visible !important;
          }

          /* Avoid breaking inside line items */
          .print-no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Force background colors and images */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-header-modern {
            background: linear-gradient(to right, #1e293b, #334155) !important;
          }
          .print-header-modern * {
            color: white !important;
          }

          .print-total-modern {
            background: linear-gradient(to right, #1e293b, #334155) !important;
          }
          .print-total-modern * {
            color: white !important;
          }
        }
      `}</style>
      
      {/* Action Bar - Always visible, not affected by preview mode */}
      <Card className="no-print">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(createPageUrl(isEstimate ? 'Estimates' : 'Invoices'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {isEstimate ? 'Estimates' : 'Invoices'}
            </Button>
            {showEditButton && (
              <Link to={createPageUrl(`EditInvoice?id=${invoiceProp.id}`)}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit {isEstimate ? 'Estimate' : 'Invoice'}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Convert to Invoice Button */}
            {isEstimate && invoice.status === 'accepted' && (
              <Button onClick={handleConvertToInvoice} disabled={isConverting} className="bg-green-600 hover:bg-green-700 text-white">
                {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCw className="w-4 h-4 mr-2" />}
                Convert to Invoice
              </Button>
            )}

            {/* Status Changer */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Status:</span>
              <Select
                value={invoice.status}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft"><div className="flex items-center gap-2"><FileText className="w-4 h-4" />Draft</div></SelectItem>
                  <SelectItem value="sent"><div className="flex items-center gap-2"><Send className="w-4 h-4" />Sent</div></SelectItem>
                  <SelectItem value="viewed"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />Viewed</div></SelectItem>
                  {isEstimate ? (
                    <>
                      <SelectItem value="accepted"><div className="flex items-center gap-2"><FileCheck className="w-4 h-4" />Accepted</div></SelectItem>
                      <SelectItem value="declined"><div className="flex items-center gap-2"><X className="w-4 h-4 text-red-500"/>Declined</div></SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="paid"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />Paid</div></SelectItem>
                      <SelectItem value="overdue"><div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />Overdue</div></SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
                className={previewMode ? 'bg-blue-100 border-blue-300' : ''}
              >
                {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {previewMode ? 'Exit Preview' : 'Preview Mode'}
              </Button>
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Card */}
      <div id="invoice-print-root">
      <Card id="invoice-viewer-content" className={`shadow-xl transition-all duration-500 ${isClassic ? 'font-serif' : 'font-sans'}`}>
        <CardHeader className={`transition-all duration-500 ${isClassic ? 'bg-white border-b-2 border-black' : `text-white ${isEstimate ? 'bg-gradient-to-r from-cyan-800 to-blue-900' : 'bg-gradient-to-r from-slate-800 to-slate-900'} print-header-modern`}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {/* FIXED: Better logo display logic */}
              {userCompany?.company_logo_url && (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-white p-2 flex-shrink-0 shadow-md">
                  <img
                    src={userCompany.company_logo_url}
                    alt={userCompany.company_name || "Company logo"}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error("Logo failed to load:", userCompany.company_logo_url);
                      e.target.style.display = 'none'; // Hide the broken image icon
                    }}
                    onLoad={() => {
                      console.log("Logo loaded successfully:", userCompany.company_logo_url);
                    }}
                  />
                </div>
              )}
              {/* DEBUG: Show if no logo URL */}
              {!userCompany?.company_logo_url && userCompany && (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                  No Logo
                </div>
              )}
              <div>
                <h2 className={`text-3xl md:text-4xl font-bold ${isClassic ? 'text-black' : 'text-white'}`}>{isEstimate ? 'ESTIMATE' : 'INVOICE'}</h2>
                <p className={`mt-1 text-lg ${isClassic ? 'text-slate-600' : 'text-slate-300'}`}>
                  #{invoice.invoice_number}
                </p>
                {invoice.po_number && (
                  <p className={`mt-0.5 text-sm ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>
                    PO#: {invoice.po_number}
                  </p>
                )}
                {userCompany?.company_name && (
                  <p className={`text-lg font-semibold mt-2 ${isClassic ? 'text-slate-800' : 'text-slate-100'}`}>
                    {userCompany.company_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-8">
          {/* Project Showcase Image */}
          {invoice.project_hero_image_url && (
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <img 
                src={invoice.project_hero_image_url} 
                alt="Project Showcase" 
                className="w-full h-auto object-cover max-h-96"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
            <div>
              <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Bill To</Label>
              <div className="mt-2 space-y-1">
                <p className="font-bold text-slate-900 text-lg">{invoice.client_name}</p>
                {invoice.client_company && invoice.client_company !== invoice.client_name && (
                  <p className="text-slate-700 font-medium">{invoice.client_company}</p>
                )}
                {invoice.client_contact_person && (
                  <p className="text-slate-600 text-sm">Attn: {invoice.client_contact_person}</p>
                )}
                {invoice.client_address && (
                  <p className="text-slate-600 text-sm whitespace-pre-line">{invoice.client_address}</p>
                )}
                {invoice.client_email && (
                  <p className="text-slate-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {invoice.client_email}
                  </p>
                )}
                {invoice.client_phone && (
                  <p className="text-slate-600 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {invoice.client_phone}
                  </p>
                )}
              </div>
            </div>

            <div className="md:text-right">
              <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{isEstimate ? 'Estimate Details' : 'Invoice Details'}</Label>
              <div className="mt-2 space-y-1">
                {invoice.po_number && (
                  <div className="flex items-center md:justify-end gap-2">
                    <span className="text-slate-700 font-semibold">PO Number:</span>
                    <span className="font-mono text-slate-800">{invoice.po_number}</span>
                  </div>
                )}
                <div className="flex items-center md:justify-end gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-700 font-semibold">Issued:</span>
                  <span>{format(new Date((invoice.invoice_date || invoice.created_date) + 'T12:00:00'), 'MMM dd, yyyy')}</span>
                </div>
                {!isEstimate && (
                  <div className="flex items-center md:justify-end gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-700 font-semibold">Due Date:</span>
                    <span>{format(new Date(invoice.due_date + 'T12:00:00'), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                <div className="flex items-center md:justify-end gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-700 font-semibold">Invoice #:</span>
                  <span className="font-mono text-slate-800">{invoice.invoice_number}</span>
                </div>
                {invoice.po_number && (
                  <div className="flex items-center md:justify-end gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-700 font-semibold">PO #:</span>
                    <span className="font-mono text-slate-800">{invoice.po_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6 md:mb-8">
            <div className="hidden md:block rounded-lg overflow-hidden border border-slate-200">
              <div className={`grid grid-cols-12 gap-4 p-4 font-semibold text-sm items-center ${isClassic ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-700'}`}>
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {invoice.line_items.map((item, index) => {
                // Find any discount items that follow this item (before next non-discount)
                const relatedDiscounts = !item.is_discount ? invoice.line_items.slice(index + 1).filter((next, i, arr) => {
                  // Only grab discount items immediately following until we hit a non-discount
                  const prevItems = arr.slice(0, i);
                  return next.is_discount && prevItems.every(p => p.is_discount);
                }) : [];

                if (item.is_discount) return null;
                return (
                  <React.Fragment key={index}>
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 items-start print-no-break">
                      <div className="col-span-6">
                        <div className="flex gap-3">
                          {item.thumbnail_url && (
                             <div
                               className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border cursor-pointer flex-shrink-0 relative"
                               onClick={() => openImageCarousel(item.file_urls || [item.thumbnail_url])}
                             >
                               <img src={item.thumbnail_url} alt="Item reference" className="w-full h-full object-cover" />
                             </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{item.description}</p>
                            <p className="text-sm text-slate-600">{item.detail}</p>
                            {/* Inline discount note if next item is a discount */}
                            {invoice.line_items[index + 1]?.is_discount && (() => {
                              const discountItem = invoice.line_items[index + 1];
                              const discountAmt = Math.abs(discountItem.total || 0);
                              const newPrice = (item.total || 0) - discountAmt;
                              return (
                                <p className="text-xs text-red-500 mt-1 italic font-medium">
                                  ↳ Discount: -${discountAmt.toFixed(2)} <span className="text-red-600 font-bold">/ Now ${newPrice.toFixed(2)}</span>
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">${(item.unit_price || 0).toFixed(2)}</div>
                      <div className="col-span-2 text-right font-bold">${(item.total || 0).toFixed(2)}</div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="md:hidden space-y-4">
              {invoice.line_items.map((item, index) => !item.is_discount && (
                <Card key={index} className="p-4">
                  <div className="flex gap-3">
                    {item.thumbnail_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border cursor-pointer flex-shrink-0 relative" onClick={() => openImageCarousel(item.file_urls || [item.thumbnail_url])}>
                        <img src={item.thumbnail_url} alt="Item reference" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{item.description}</p>
                      <p className="text-sm text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t text-sm">
                    <p className="text-slate-600">Qty: {item.quantity}</p>
                    <p className="text-slate-600">@ ${(item.unit_price || 0).toFixed(2)}</p>
                    <p className="font-bold text-slate-900">${(item.total || 0).toFixed(2)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* This space is intentionally left blank to push totals to the right */}
            <div className="flex-1 space-y-6"></div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-full md:w-80 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Subtotal:</span>
                    <span className="font-semibold text-slate-900">${(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>

                  {/* Condensed Discounts - one line total */}
                  {generalDiscounts.length > 0 && (() => {
                    const totalDiscount = generalDiscounts.reduce((sum, d) => sum + Math.abs(d.total || 0), 0);
                    return (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-pink-50 rounded border border-pink-100">
                        <span className="text-slate-600 text-sm font-medium">Discount{generalDiscounts.length > 1 ? ` (×${generalDiscounts.length})` : ''}:</span>
                        <span className="font-semibold text-red-600">-${totalDiscount.toFixed(2)}</span>
                      </div>
                    );
                  })()}

                  {/* Tax */}
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-600 font-medium">Tax ({invoice.tax_rate || 0}%):</span>
                      <span className="font-semibold text-slate-900">${(invoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Deposit line (above total) */}
                  {deposits.length > 0 && (() => {
                    const totalDeposits = deposits.reduce((sum, d) => sum + Math.abs(d.total || 0), 0);
                    return (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-blue-50 rounded border border-blue-100">
                        <span className="text-slate-600 text-sm font-medium">Deposit{deposits.length > 1 ? ` (×${deposits.length})` : ''}:</span>
                        <span className="font-semibold text-blue-600">-${totalDeposits.toFixed(2)}</span>
                      </div>
                    );
                  })()}

                  {/* Total */}
                  <div className={`flex justify-between items-center py-4 px-4 rounded-lg transition-all duration-500 ${isClassic ? 'bg-slate-100 border-2 border-slate-300' : 'bg-slate-900 text-white print-total-modern shadow-lg'}`}>
                    <span className={`text-xl font-bold ${isClassic ? 'text-black' : 'text-white'}`}>Total:</span>
                    <span className={`text-2xl md:text-3xl font-bold flex items-center gap-1 ${isClassic ? 'text-black' : 'text-white'}`}>
                      <DollarSign className="w-6 md:w-8 h-6 md:h-8" />
                      {(invoice.total_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Balance Due */}
                  {!isEstimate && (() => {
                    const totalDeposits = deposits.reduce((sum, d) => sum + Math.abs(d.total || 0), 0);
                    const balanceDue = (invoice.total_amount || 0) - totalDeposits;
                    return (
                      <div className="flex justify-between items-center py-2 mt-1 border-t-2 border-slate-300 font-bold">
                        <span className="text-slate-800 text-lg">Balance Due:</span>
                        <span className="text-xl text-slate-900">${balanceDue.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                </div>
            </div>
          </div>

          {/* Notes & Payment Instructions - Moved below totals */}
          <div className="mt-8 pt-8 border-t border-slate-200 grid md:grid-cols-2 gap-8">
              {invoice.notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Notes & Terms</Label>
                  <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {userCompany?.payment_details && !isEstimate && ( // Only show payment details for invoices
                <Card className="bg-green-50 border-2 border-green-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-green-900 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Payment Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-green-800 whitespace-pre-wrap text-base">
                    {userCompany.payment_details}
                  </CardContent>
                </Card>
              )}
          </div>
        </CardContent>
      </Card>

      </div>{/* end invoice-print-root */}

      {/* Image Carousel */}
      <ImageCarousel
        images={carouselImages}
        isOpen={showCarousel}
        onClose={() => setShowCarousel(false)}
      />
    </motion.div>
  );
}