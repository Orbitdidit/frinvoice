import React, { useState, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { InvokeLLM } from "@/integrations/Core";
import {
  FileText,
  Wand2,
  RefreshCw,
  FileUp,
  Sparkles,
  Mic,
  Edit,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import InvoiceEditor from "../components/invoices/InvoiceEditor";
import ManualInput from "../components/voice/ManualInput";
import PdfInvoiceUploader from "../components/invoices/PdfInvoiceUploader";
import ScreenshotInvoiceUploader from "../components/invoices/ScreenshotInvoiceUploader";
import VoiceSetupGuide from "../components/voice/VoiceSetupGuide";
import VoiceRecorder from "../components/voice/VoiceRecorder";
import VoiceTranscript from "../components/voice/VoiceTranscript";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [inputMode, setInputMode] = useState("ai");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientData = await Client.list();
      setClients(clientData);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const createBlankInvoice = () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return {
      invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      client_name: "",
      client_email: "",
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      line_items: [{
          description: "",
          detail: "",
          quantity: 1,
          unit_price: 0,
          total: 0,
          is_discount: false,
          file_urls: []
      }],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      deposit_amount: 0,
      total_amount: 0,
      notes: "",
      template: "modern",
      status: "draft"
    };
  };

  const handleInputModeChange = (mode) => {
    if (mode === 'editor') {
      setIsAiGenerated(false);
      setInvoiceData(createBlankInvoice());
    } else {
      setInvoiceData(null);
      setInputMode(mode);
    }
  };

  const processCommand = async (inputText) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const prompt = `
You are Frinvoice AI, an assistant specialized in converting natural language requests into detailed, professional invoices.

Context: The user has provided the following request for creating an invoice:
"${inputText}"

Your task is to extract and structure this information into a comprehensive invoice format. Be intelligent about:
1. Identifying the client/company name and email.
2. Breaking down services into clear line items with descriptions.
3. Calculating appropriate pricing (use reasonable market rates if not specified).
4. Identifying any discounts OR deposits mentioned. Treat deposits as a form of discount.
5. Generating a professional invoice number.

Rules:
- If pricing isn't specified, use reasonable industry standard rates.
- Break complex services into individual line items.
- Include detailed descriptions for each item.
- **IMPORTANT**: Apply any discounts or deposits as separate line items with negative amounts and set the 'is_discount' flag to true.
- Generate a unique invoice number (format: INV-YYYY-XXXX).
- Set invoice date to today's date.
- Set due date to 30 days from today if not specified.
- Use professional language for all descriptions.
- Try to extract a phone number if mentioned.
Return the invoice data in the exact JSON structure specified.
`;

      const invoiceSchema = {
        type: "object",
        properties: {
          invoice_number: { type: "string" },
          client_name: { type: "string" },
          client_email: { type: "string" },
          client_phone: { type: "string" },
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
                is_discount: { type: "boolean" }
              }
            }
          },
          subtotal: { type: "number" },
          discount_amount: { type: "number" },
          tax_rate: { type: "number" },
          tax_amount: { type: "number" },
          total_amount: { type: "number" },
          notes: { type: "string" },
          voice_transcript: { type: "string" }
        }
      };

      const result = await InvokeLLM({
        prompt,
        response_json_schema: invoiceSchema
      });

      result.voice_transcript = inputText;
      result.template = "modern";
      
      const today = new Date().toISOString().split('T')[0];
      result.invoice_date = result.invoice_date || today;
      
      if (!result.due_date) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        result.due_date = dueDate.toISOString().split('T')[0];
      }

      const subtotal = result.line_items.reduce((sum, item) => sum + (item.is_discount ? 0 : item.total), 0);
      const discountAmount = Math.abs(result.line_items.reduce((sum, item) => sum + (item.is_discount ? item.total : 0), 0));
      const taxRate = result.tax_rate || 0;
      result.subtotal = subtotal;
      result.discount_amount = discountAmount;
      result.tax_amount = (subtotal - discountAmount) * (taxRate / 100);
      result.total_amount = subtotal - discountAmount + result.tax_amount;

      setIsAiGenerated(true);
      setInvoiceData(result);

    } catch (error) {
      console.error("Error processing command:", error);
      setError("Failed to process your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfDataExtracted = (data) => {
    setError(null);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      setError("The AI could not extract any usable invoice data from the document. Please try a different file/image or enter the details manually.");
      return;
    }

    const extractedData = Array.isArray(data) ? data[0] : data;

    if (!extractedData.line_items || extractedData.line_items.length === 0) {
      setError("The AI could not identify any line items in the invoice. Please check the document's format or enter the details manually.");
      return;
    }

    const finalData = { ...extractedData };
    finalData.template = "modern";
    finalData.invoice_date = finalData.invoice_date || new Date().toISOString().split('T')[0];

    finalData.line_items = finalData.line_items || [];

    const subtotal = finalData.line_items.reduce((sum, item) => sum + (item.is_discount ? 0 : (item.total || 0)), 0);
    const discountAmount = Math.abs(finalData.line_items.reduce((sum, item) => sum + (item.is_discount ? (item.total || 0) : 0), 0));
    const taxRate = finalData.tax_rate || 0;
    
    finalData.subtotal = subtotal;
    finalData.discount_amount = discountAmount;
    finalData.tax_amount = (subtotal - discountAmount) * (taxRate / 100);
    finalData.total_amount = subtotal - discountAmount + finalData.tax_amount;

    setIsAiGenerated(true);
    setInvoiceData(finalData);
  };

  const saveAndClose = async (dataToSave) => {
    if (!dataToSave) return;

    try {
      if (dataToSave.client_name) {
          const existingClient = await Client.filter({ name: dataToSave.client_name });
          if (existingClient.length === 0) {
              await Client.create({
                  name: dataToSave.client_name,
                  email: dataToSave.client_email || ''
              });
              await loadClients();
          }
      }

      const newInvoice = await Invoice.create({ ...dataToSave, status: "draft" });
      navigate(createPageUrl(`InvoiceDetail?id=${newInvoice.id}`));
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("Failed to save invoice. Please try again.");
    }
  };

  const resetSession = () => {
    setManualInput("");
    setInvoiceData(null);
    setError(null);
    setInputMode("ai");
    setTranscript("");
    setIsAiGenerated(false);
  };

  const handleProcessClick = () => {
    processCommand(manualInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl">
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Create Invoice
                </h1>
                <p className="text-sm text-slate-500 font-medium">Powered by Frinvoice AI</p>
              </div>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Generate professional invoices in seconds using AI text, voice commands, or upload receipts and documents
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {invoiceData ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <InvoiceEditor
                invoiceData={invoiceData}
                onSave={saveAndClose}
                onCancel={resetSession}
                isNew={isAiGenerated}
                isEditing={true}
              />
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-xl">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b">
                  <Tabs value={inputMode} onValueChange={handleInputModeChange} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-5 bg-slate-100">
                      <TabsTrigger value="editor" className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Text
                      </TabsTrigger>
                      <TabsTrigger value="voice" className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Voice
                      </TabsTrigger>
                      <TabsTrigger value="screenshot" className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        📸
                      </TabsTrigger>
                      <TabsTrigger value="pdf" className="flex items-center gap-2">
                        <FileUp className="w-4 h-4" />
                        PDF
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={inputMode}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {inputMode === 'ai' && (
                        <div className="space-y-6">
                          <ManualInput
                            value={manualInput}
                            onChange={setManualInput}
                            isProcessing={isProcessing}
                          />
                          <div className="flex justify-center">
                             <Button
                                onClick={handleProcessClick}
                                disabled={!manualInput || isProcessing}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg"
                              >
                                {isProcessing ? (
                                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                                ) : (
                                  <><Sparkles className="w-5 h-5 mr-2" />Generate Invoice with AI</>
                                )}
                              </Button>
                          </div>
                        </div>
                      )}

                      {inputMode === 'voice' && (
                        <div className="space-y-6">
                          <VoiceSetupGuide />
                          <VoiceRecorder
                            onTranscriptChange={setTranscript}
                            onRecordingChange={setIsRecording}
                            isProcessing={isProcessing}
                          />
                           {(transcript && !isProcessing) && (
                              <div className="flex flex-col items-center gap-4">
                                  <VoiceTranscript transcript={transcript} isProcessing={isProcessing} />
                                  <Button
                                    onClick={() => processCommand(transcript)}
                                    disabled={!transcript || isProcessing}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg"
                                  >
                                    {isProcessing ? (
                                      <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                                    ) : (
                                      <><Wand2 className="w-5 h-5 mr-2" />Generate from Voice</>
                                    )}
                                  </Button>
                              </div>
                          )}
                        </div>
                      )}
                      
                      {inputMode === 'screenshot' && (
                         <ScreenshotInvoiceUploader 
                           onDataExtracted={handlePdfDataExtracted} 
                           onProcessing={setIsProcessing} 
                         />
                      )}

                      {inputMode === 'pdf' && (
                         <PdfInvoiceUploader 
                           onDataExtracted={handlePdfDataExtracted} 
                           onProcessing={setIsProcessing} 
                         />
                      )}
                    </motion.div>
                  </AnimatePresence>
                  
                   {isProcessing && (
                     <div className="flex flex-col items-center justify-center text-center p-4">
                        <RefreshCw className="w-8 h-8 mr-2 animate-spin text-purple-600" />
                        <p className="text-slate-700 font-semibold mt-4">Processing your request...</p>
                        <p className="text-slate-500">Frinvoice AI is generating your invoice.</p>
                     </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="mt-8 p-4 md:p-6 bg-slate-50 rounded-xl border">
                <h3 className="font-semibold text-slate-800 mb-3">
                  {inputMode === 'editor' && 'Manual Editor:'}
                  {inputMode === 'ai' && 'AI Assistant Examples:'}
                  {inputMode === 'voice' && 'Voice Commands:'}
                  {inputMode === 'screenshot' && 'Screenshot to Invoice:'}
                  {inputMode === 'pdf' && 'PDF Upload:'}
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  {inputMode === 'editor' && (
                    <>
                      <p>• Use the full-featured editor to build your invoice from scratch.</p>
                      <p>• Add line items, upload images, set discounts, and more.</p>
                      <p>• Perfect for maximum control over every detail.</p>
                    </>
                  )}
                  {inputMode === 'ai' && (
                    <>
                      <p className="italic"><strong>Try:</strong> "Invoice ABC Corp for logo design, 5 hours at $100/hour"</p>
                      <p className="italic"><strong>Or:</strong> "Create invoice for John Smith, website development, $2500"</p>
                      <p className="italic"><strong>Or:</strong> "Bill Exotic Pop for LED wall installation, $88,000"</p>
                    </>
                  )}
                  {inputMode === 'voice' && (
                    <>
                      <p className="italic"><strong>Say:</strong> "Create an invoice for ABC Company for website work"</p>
                      <p className="italic"><strong>Or:</strong> "Bill John Smith for 5 hours of consulting at $150 per hour"</p>
                      <p className="italic"><strong>Or:</strong> "Invoice for LED display installation, $50,000"</p>
                    </>
                  )}
                  {inputMode === 'screenshot' && (
                    <>
                      <p>• Upload a screenshot or photo of any receipt, invoice, or quote</p>
                      <p>• Frinvoice AI extracts all data instantly - no manual typing needed</p>
                      <p>• Perfect for converting photos into professional invoices in seconds</p>
                    </>
                  )}
                  {inputMode === 'pdf' && (
                    <>
                      <p>• Upload existing PDF invoices or quotes to convert them</p>
                      <p>• AI extracts all relevant data automatically</p>
                      <p>• Perfect for converting old invoices to the new format</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}