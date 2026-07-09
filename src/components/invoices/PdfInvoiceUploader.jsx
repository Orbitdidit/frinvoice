import { useState, useCallback } from 'react';
import { UploadFile, ExtractDataFromUploadedFile } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PdfInvoiceUploader({ onDataExtracted, onProcessing }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file only.');
      return;
    }
    
    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    
    setError(null);
    setProgress(0);
    onProcessing(true);

    try {
      // Step 1: Upload the file
      setStatus('uploading');
      setProgress(20);
      
      const uploadResult = await UploadFile({ file: selectedFile });
      if (!uploadResult?.file_url) {
        throw new Error('Failed to upload file. Please try again.');
      }
      
      setProgress(40);
      console.log('File uploaded successfully:', uploadResult.file_url);

      // Step 2: Extract data using AI
      setStatus('processing');
      setProgress(60);
      
      const invoiceSchema = {
        type: "object",
        properties: {
          invoice_number: { 
            type: "string", 
            description: "Invoice, quote, or reference number from the document" 
          },
          client_name: { 
            type: "string", 
            description: "Client or company name being billed" 
          },
          client_email: { 
            type: "string", 
            description: "Client email address if available" 
          },
          invoice_date: { 
            type: "string", 
            format: "date", 
            description: "Date the invoice/quote was created" 
          },
          due_date: { 
            type: "string", 
            format: "date", 
            description: "Payment due date" 
          },
          line_items: {
            type: "array",
            description: "List of products or services",
            items: {
              type: "object",
              properties: {
                description: { 
                  type: "string", 
                  description: "Product or service name/description" 
                },
                detail: { 
                  type: "string", 
                  description: "Additional details about the item" 
                },
                quantity: { 
                  type: "number", 
                  description: "Quantity of items" 
                },
                unit_price: { 
                  type: "number", 
                  description: "Price per unit" 
                },
                total: { 
                  type: "number", 
                  description: "Total price for this line item" 
                }
              },
              required: ["description", "quantity", "unit_price", "total"]
            }
          },
          subtotal: { 
            type: "number", 
            description: "Subtotal before taxes and discounts" 
          },
          tax_rate: { 
            type: "number", 
            description: "Tax rate as percentage" 
          },
          tax_amount: { 
            type: "number", 
            description: "Total tax amount" 
          },
          discount_amount: { 
            type: "number", 
            description: "Any discount applied" 
          },
          total_amount: { 
            type: "number", 
            description: "Final total amount" 
          },
          notes: { 
            type: "string", 
            description: "Terms, conditions, or additional notes" 
          }
        }
      };

      const extractResult = await ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: invoiceSchema
      });

      setProgress(80);

      if (extractResult.status === 'success' && extractResult.output) {
        const extractedData = Array.isArray(extractResult.output) ? extractResult.output[0] : extractResult.output;
        
        // Ensure invoice_date defaults to today if not extracted
        const today = new Date().toISOString().split('T')[0];
        extractedData.invoice_date = extractedData.invoice_date || today;
        
        // Ensure due_date is set (30 days from today if not extracted)
        if (!extractedData.due_date) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          extractedData.due_date = dueDate.toISOString().split('T')[0];
        }

        setProgress(100);
        setStatus('success');
        onDataExtracted(extractedData);
        
      } else {
        throw new Error(extractResult.details || 'Failed to extract data from PDF');
      }
      
    } catch (error) {
      console.error('PDF processing error:', error);
      setError(error.message || 'Failed to process PDF');
      setStatus('error');
    } finally {
      onProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      handleFileSelect(acceptedFiles[0]);
    }
  }, []);

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Upload Area — paper card, dashed ink border */}
      <div
        className={`rounded-md border-2 border-dashed transition-colors duration-300 p-8 ${
          status === 'success' ? 'border-money bg-money/5' :
          status === 'error' ? 'border-stamp bg-stamp/5' :
          'border-ink bg-[#fffdf7] hover:bg-paper'
        }`}
      >
        <div className="text-center space-y-4">
          {/* Status Icons */}
          {status === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 mx-auto rounded-full border-2 border-ink bg-money/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-money" />
            </motion.div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-ink bg-stamp/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-stamp" />
            </div>
          )}
          {(status === 'uploading' || status === 'processing') && (
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-ink bg-paper flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-ink animate-spin" />
            </div>
          )}
          {status === 'idle' && (
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-ink bg-paper flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-ink" />
            </div>
          )}

          {/* Status Messages */}
          <div>
            <h3 className="text-base font-heading font-bold text-ink mb-1">
              {status === 'idle' && 'Upload PDF Invoice or Quote'}
              {status === 'uploading' && 'Uploading PDF…'}
              {status === 'processing' && 'Extracting Data with AI…'}
              {status === 'success' && 'PDF Processed Successfully!'}
              {status === 'error' && 'Upload Failed'}
            </h3>
            <p className="font-mono text-xs text-ink/60 mb-4">
              {status === 'idle' && 'Drag and drop your PDF here, or click to browse'}
              {status === 'uploading' && 'Uploading your file to the server…'}
              {status === 'processing' && 'AI is reading and extracting invoice data…'}
              {status === 'success' && 'Data extracted! Review your invoice below.'}
              {status === 'error' && error}
            </p>
          </div>

          {/* Progress Bar */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="w-full bg-paper border-2 border-ink rounded-full h-3 mb-4 overflow-hidden">
              <motion.div
                className="bg-money h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* File Input */}
          {status === 'idle' && (
            <>
              <input type="file" accept=".pdf" onChange={handleFileInputChange} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Button variant="outline" className="font-mono" asChild>
                  <span>
                    <FileText className="w-4 h-4 mr-2" />
                    Choose PDF File
                  </span>
                </Button>
              </label>
            </>
          )}

          {/* Try Again Button */}
          {status === 'error' && (
            <Button onClick={resetUploader} variant="outline" className="font-mono">
              Try Another File
            </Button>
          )}

          {/* File Info */}
          {file && status !== 'idle' && (
            <div className="mt-4 p-3 rounded-md border-2 border-ink bg-paper">
              <div className="flex items-center justify-center gap-2 font-mono">
                <FileText className="w-5 h-5 text-ink" />
                <span className="text-sm font-medium text-ink">{file.name}</span>
                <span className="text-xs text-ink/50">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      {status === 'idle' && (
        <div className="rounded-md border-2 border-ink bg-paper p-4">
          <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-ink mb-2">Tips for best results</h4>
          <ul className="font-mono text-xs text-ink/70 space-y-1">
            <li>• Upload clear, text-based PDFs (not scanned images)</li>
            <li>• Make sure the PDF contains line items with prices</li>
            <li>• Client information should be clearly visible</li>
            <li>• File size should be under 10MB</li>
          </ul>
        </div>
      )}
    </div>
  );
}