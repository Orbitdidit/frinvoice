
import { useState, useRef, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { InvokeLLM } from "@/integrations/Core";
import {
  Mic,
  Wand2,
  Keyboard,
  MessageSquare,
  RefreshCw,
  FileUp,
  Zap,
  Camera // Added Camera icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import VoiceRecorder from "../components/voice/VoiceRecorder";
import InvoiceEditor from "../components/invoices/InvoiceEditor";
import VoiceTranscript from "../components/voice/VoiceTranscript";
import ManualInput from "../components/voice/ManualInput";
import SendConfirmationModal from "../components/invoices/SendConfirmationModal";
import VoiceConversation from "../components/voice/VoiceConversation";
import VoiceSetupGuide from "../components/voice/VoiceSetupGuide";
import PdfInvoiceUploader from "../components/invoices/PdfInvoiceUploader";
import ScreenshotInvoiceUploader from "../components/invoices/ScreenshotInvoiceUploader"; // Added ScreenshotInvoiceUploader

const speak = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  } else {
    console.log('Text-to-speech not supported in this browser.');
  }
};

export default function VoiceInvoice() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [inputMode, setInputMode] = useState("voice");
  const [showSendModal, setShowSendModal] = useState(false);
  const wasRecording = useRef(false);
  const [showVoiceConversation, setShowVoiceConversation] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Auto-trigger processing when recording stops
    if (inputMode === "voice" && wasRecording.current && !isRecording && transcript.trim()) {
      processCommand(transcript);
    }
    wasRecording.current = isRecording;
  }, [isRecording, transcript, inputMode]);

  const loadClients = async () => {
    try {
      const clientData = await Client.list();
      setClients(clientData);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const processCommand = async (inputText) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const prompt = `
You are INVIO, an AI assistant specialized in converting natural language requests into detailed, professional invoices.

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
- **IMPORTANT**: Apply any discounts or deposits as separate line items with negative amounts and set the 'is_discount' flag to true. For example, a '$250 deposit' should become a line item with description 'Deposit' and a total of -250.
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
      
      // Ensure invoice_date defaults to today
      const today = new Date().toISOString().split('T')[0];
      result.invoice_date = result.invoice_date || today;
      
      // Ensure due_date is set (30 days from today if not specified)
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

      setInvoiceData(result);
      speak(`I've generated the invoice for ${result.client_name}. Would you like to review it?`);
      setShowSendModal(false);

    } catch (error) {
      console.error("Error processing command:", error);
      setError("Failed to process your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePdfDataExtracted = (data) => {
    console.log('Data extracted:', data); // Changed log message to be more generic
    
    setError(null);

    if (!data) {
      setError("No data could be extracted. Please try a different file/image or enter details manually."); // Generic error message
      return;
    }

    // Ensure we have the basic structure and default values
    const finalData = {
      invoice_number: data.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      client_name: data.client_name || 'Client Name',
      client_email: data.client_email || '',
      invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      line_items: data.line_items || [],
      subtotal: data.subtotal || 0,
      tax_rate: data.tax_rate || 0,
      tax_amount: data.tax_amount || 0,
      discount_amount: data.discount_amount || 0,
      total_amount: data.total_amount || 0,
      notes: data.notes || '',
      template: "modern"
    };

    // Validate line items
    if (finalData.line_items.length === 0) {
      setError("No line items found. Please add items manually or try a different file/image."); // Generic error message
      return;
    }

    // Recalculate totals to ensure consistency
    const subtotal = finalData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (finalData.tax_rate / 100);
    const totalAmount = subtotal + taxAmount - (finalData.discount_amount || 0);

    finalData.subtotal = subtotal;
    finalData.tax_amount = taxAmount;
    finalData.total_amount = totalAmount;

    console.log('Final processed data:', finalData);
    setInvoiceData(finalData);
    speak(`I've extracted the data. Please review the invoice.`); // Generic speak message
  };
  
  const saveInvoiceAsDraft = async () => {
    if (!invoiceData) return;

    try {
      if (invoiceData.client_name) {
          const existingClient = await Client.filter({ name: invoiceData.client_name });
          if (existingClient.length === 0) {
              await Client.create({
                  name: invoiceData.client_name,
                  email: invoiceData.client_email || ''
              });
              await loadClients();
          }
      }

      const newInvoice = await Invoice.create({ ...invoiceData, status: "draft" });
      navigate(createPageUrl(`InvoiceDetail?id=${newInvoice.id}`));
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("Failed to save invoice. Please try again.");
    }
  };
  
  const saveAndClose = async () => {
    await saveInvoiceAsDraft();
    resetSession();
  };

  const resetSession = () => {
    setIsRecording(false);
    setTranscript("");
    setManualInput("");
    setInvoiceData(null);
    setError(null);
    setShowSendModal(false);
    setShowVoiceConversation(false);
    setInputMode("voice"); // Reset to voice as default
  };

  const getCurrentInput = () => {
    return inputMode === "voice" ? transcript : manualInput;
  };

  const handleProcessClick = () => {
    const inputText = getCurrentInput();
    processCommand(inputText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">AI Invoice Creator</h1>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Create invoices by voice, typing details, or uploading a PDF. 🆓 <strong>5 FREE hours</strong> of premium voice per month!
          </p>
        </motion.div>

        {/* Main Input Area - Show if no invoice data */}
        {!invoiceData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-xl">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b">
                <Tabs value={inputMode} onValueChange={setInputMode} className="w-full md:w-auto">
                  <TabsList className="grid w-full grid-cols-4 bg-slate-100"> {/* Changed to grid-cols-4 */}
                    <TabsTrigger value="voice" className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Voice 🆓
                    </TabsTrigger>
                    {/* Added Screenshot Tab Trigger */}
                    <TabsTrigger value="screenshot" className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      📸
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Keyboard className="w-4 h-4" />
                      Type
                    </TabsTrigger>
                    <TabsTrigger value="pdf" className="flex items-center gap-2">
                      <FileUp className="w-4 h-4" />
                      PDF
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="outline"
                  onClick={() => setShowVoiceConversation(true)}
                  className="bg-purple-50 hover:bg-purple-100"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Conversation 🤖
                </Button>
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
                                  onClick={handleProcessClick}
                                  disabled={!transcript || isProcessing}
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg"
                                >
                                  {isProcessing ? (
                                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                                  ) : (
                                    <><Wand2 className="w-5 h-5 mr-2" />Generate from Transcript</>
                                  )}
                                </Button>
                            </div>
                        )}
                      </div>
                    )}

                    {inputMode === 'manual' && (
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
                                <><Wand2 className="w-5 h-5 mr-2" />Generate Invoice</>
                              )}
                            </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Added Screenshot Input Mode */}
                    {inputMode === 'screenshot' && (
                       <ScreenshotInvoiceUploader 
                         onDataExtracted={handlePdfDataExtracted} 
                         onProcessing={setIsProcessing} 
                       />
                    )}

                    {/* PDF Input Mode */}
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
                      <p className="text-slate-500">INVIO is generating your invoice.</p>
                   </div>
                )}
              </CardContent>
            </Card>
            
            {/* Updated Example Commands with Voice First */}
            <div className="mt-8 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-purple-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Examples - Now with 🆓 FREE Voice AI:
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="italic flex items-start gap-2">
                  <Mic className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                  <span><strong>🆓 Voice (FREE):</strong> "Create an invoice for John Smith for website work, 10 hours at 75 dollars per hour"</span>
                </p>
                {/* Added Screenshot Example */}
                <p className="italic flex items-start gap-2">
                  <Camera className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                  <span><strong>Screenshot:</strong> Upload an image of an invoice or receipt</span>
                </p>
                <p className="italic flex items-start gap-2">
                  <FileUp className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  <span><strong>Upload:</strong> Any PDF quotation or invoice to convert it</span>
                </p>
                <p className="italic flex items-start gap-2">
                  <Keyboard className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span><strong>Type:</strong> "Invoice ABC Corp for logo design, 5 hours at $100/hour"</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
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

        {/* Invoice Preview & Editor */}
        <AnimatePresence>
          {invoiceData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <InvoiceEditor
                invoiceData={invoiceData}
                onSave={saveAndClose}
                onCancel={resetSession}
                isNew={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Conversation Modal */}
        <AnimatePresence>
          {showVoiceConversation && (
            <VoiceConversation
              onInvoiceDataGenerated={(data) => {
                setInvoiceData(data);
                setShowVoiceConversation(false);
              }}
              onClose={() => {
                setShowVoiceConversation(false);
              }}
            />
          )}
        </AnimatePresence>

        <SendConfirmationModal 
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            invoiceData={invoiceData}
            onSaveDraft={saveInvoiceAsDraft}
        />
      </div>
    </div>
  );
}
