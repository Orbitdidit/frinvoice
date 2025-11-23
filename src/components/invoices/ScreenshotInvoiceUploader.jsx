import React, { useState, useCallback } from 'react';
import { UploadFile, InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Image as ImageIcon, Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScreenshotInvoiceUploader({ onDataExtracted, onProcessing }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, HEIC, WebP).');
      return;
    }
    
    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(selectedFile);
    
    processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    
    setError(null);
    setProgress(0);
    onProcessing(true);

    try {
      // Step 1: Upload the image
      setStatus('uploading');
      setProgress(20);
      
      const uploadResult = await UploadFile({ file: selectedFile });
      if (!uploadResult?.file_url) {
        throw new Error('Failed to upload image. Please try again.');
      }
      
      setProgress(40);
      console.log('📸 Image uploaded successfully:', uploadResult.file_url);

      // Step 2: Use AI Vision to extract invoice data
      setStatus('processing');
      setProgress(60);
      
      const prompt = `
You are Frinvoice AI vision assistant. Analyze this image and extract ALL invoice/quote details you can find.

The image might contain:
- Text messages discussing a project
- Email screenshots with pricing
- Written notes or quotes
- Photos of documents
- WhatsApp/iMessage conversations

Extract and structure ALL information into a professional invoice format:

INSTRUCTIONS:
1. **Client Info**: Extract client/company name, email, phone if visible
2. **Services/Items**: Identify ALL services, products, or work mentioned
3. **Pricing**: Extract or estimate reasonable prices based on context
4. **Dates**: Use today's date for invoice_date, 30 days later for due_date
5. **Details**: Add any project details, notes, or requirements mentioned
6. **Be Smart**: If pricing isn't explicit, use reasonable market rates
7. **Discounts/Deposits**: Look for any mentioned discounts or deposits

Return complete, ready-to-use invoice data.
`;

      const invoiceSchema = {
        type: "object",
        properties: {
          invoice_number: { type: "string", description: "Generate a unique invoice number" },
          client_name: { type: "string", description: "Client or company name from the image" },
          client_email: { type: "string", description: "Client email if visible" },
          client_phone: { type: "string", description: "Client phone if visible" },
          invoice_date: { type: "string", format: "date" },
          due_date: { type: "string", format: "date" },
          line_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                detail: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" },
                total: { type: "number" },
                is_discount: { type: "boolean", default: false }
              }
            }
          },
          subtotal: { type: "number" },
          discount_amount: { type: "number" },
          tax_rate: { type: "number" },
          tax_amount: { type: "number" },
          total_amount: { type: "number" },
          notes: { type: "string", description: "Any additional context or requirements from the image" }
        }
      };

      const extractResult = await InvokeLLM({
        prompt,
        response_json_schema: invoiceSchema,
        file_urls: [uploadResult.file_url]
      });

      setProgress(80);

      if (extractResult) {
        // Ensure dates are set
        const today = new Date().toISOString().split('T')[0];
        extractResult.invoice_date = extractResult.invoice_date || today;
        
        if (!extractResult.due_date) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          extractResult.due_date = dueDate.toISOString().split('T')[0];
        }

        // Calculate totals
        const subtotal = extractResult.line_items?.reduce((sum, item) => 
          sum + (item.is_discount ? 0 : (item.total || 0)), 0) || 0;
        const discountAmount = Math.abs(extractResult.line_items?.reduce((sum, item) => 
          sum + (item.is_discount ? (item.total || 0) : 0), 0) || 0);
        const taxRate = extractResult.tax_rate || 0;
        
        extractResult.subtotal = subtotal;
        extractResult.discount_amount = discountAmount;
        extractResult.tax_amount = (subtotal - discountAmount) * (taxRate / 100);
        extractResult.total_amount = subtotal - discountAmount + extractResult.tax_amount;

        setProgress(100);
        setStatus('success');
        onDataExtracted(extractResult);
        
      } else {
        throw new Error('Failed to extract data from image');
      }
      
    } catch (error) {
      console.error('Screenshot processing error:', error);
      setError(error.message || 'Failed to process screenshot');
      setStatus('error');
    } finally {
      onProcessing(false);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-all duration-300 ${
          status === 'success' ? 'border-green-400 bg-green-50' :
          status === 'error' ? 'border-red-400 bg-red-50' :
          'border-slate-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
      >
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            {/* Preview Image */}
            {previewUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4"
              >
                <img 
                  src={previewUrl} 
                  alt="Screenshot preview" 
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
              </motion.div>
            )}

            {/* Status Icons */}
            {status === 'success' && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-green-600" />
              </motion.div>
            )}
            
            {status === 'error' && (
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            
            {(status === 'uploading' || status === 'processing') && (
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            
            {status === 'idle' && !previewUrl && (
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-purple-600" />
              </div>
            )}

            {/* Status Messages */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {status === 'idle' && 'Upload Screenshot or Photo'}
                {status === 'uploading' && 'Uploading Image...'}
                {status === 'processing' && 'AI Reading Screenshot...'}
                {status === 'success' && 'Screenshot Read Successfully!'}
                {status === 'error' && 'Upload Failed'}
              </h3>
              
              <p className="text-slate-600 mb-4">
                {status === 'idle' && 'Upload a screenshot of texts, emails, quotes, or photos'}
                {status === 'uploading' && 'Uploading your image to AI vision...'}
                {status === 'processing' && 'AI is reading and extracting invoice details...'}
                {status === 'success' && 'Data extracted! Review your invoice below.'}
                {status === 'error' && error}
              </p>
            </div>

            {/* Progress Bar */}
            {(status === 'uploading' || status === 'processing') && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <motion.div 
                  className="bg-purple-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}

            {/* File Input */}
            {status === 'idle' && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <Button variant="outline" className="bg-white hover:bg-slate-50" asChild>
                      <span>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Choose Photo
                      </span>
                    </Button>
                  </label>
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white" asChild>
                      <span>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </span>
                    </Button>
                  </label>
                </div>
              </>
            )}

            {/* Try Again Button */}
            {status === 'error' && (
              <Button onClick={resetUploader} variant="outline">
                Try Another Image
              </Button>
            )}

            {/* File Info */}
            {file && status !== 'idle' && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-slate-500">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Upload Failed:</strong> {error}
            <br />
            <small className="text-slate-600">
              Make sure your image contains clear text with invoice details like client name, services, and pricing.
            </small>
          </AlertDescription>
        </Alert>
      )}

      {/* Tips */}
      {status === 'idle' && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              📸 Pro Tips for Screenshots:
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Screenshot text messages about projects</li>
              <li>• Capture email quotes or conversations</li>
              <li>• Photo written notes or hand-drawn quotes</li>
              <li>• WhatsApp/iMessage discussions with pricing</li>
              <li>• Social media DMs with project details</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}