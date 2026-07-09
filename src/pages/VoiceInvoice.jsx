import { useState, useRef, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { PricingPreset } from "@/entities/PricingPreset";
import { calculateFit } from "@/lib/rateCalc";
import { InvokeLLM } from "@/integrations/Core";
import { Mic, Wand2, Keyboard, RefreshCw, FileUp, Zap, Camera, Send, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ThermalMicButton from "../components/voice/ThermalMicButton";
import ThermalReceipt from "../components/invoices/ThermalReceipt";
import InvoiceEditor from "../components/invoices/InvoiceEditor";
import ManualInput from "../components/voice/ManualInput";
import SendConfirmationModal from "../components/invoices/SendConfirmationModal";
import VoiceConversation from "../components/voice/VoiceConversation";
import VoiceSetupGuide from "../components/voice/VoiceSetupGuide";
import PdfInvoiceUploader from "../components/invoices/PdfInvoiceUploader";
import ScreenshotInvoiceUploader from "../components/invoices/ScreenshotInvoiceUploader";

const speak = (text) => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  } else {
    console.log("Text-to-speech not supported in this browser.");
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
  const [presets, setPresets] = useState([]);
  const [inputMode, setInputMode] = useState("voice");
  const [showSendModal, setShowSendModal] = useState(false);
  const wasRecording = useRef(false);
  const [showVoiceConversation, setShowVoiceConversation] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadClients();
    loadPresets();
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

  const loadPresets = async () => {
    try {
      const presetData = await PricingPreset.list("-created_date", 100);
      setPresets(presetData);
    } catch (error) {
      console.error("Error loading presets:", error);
    }
  };

  const processCommand = async (inputText) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const prompt = `
You are INVOX, an AI assistant specialized in converting natural language requests into detailed, professional invoices.

Context: The user has provided the following request for creating an invoice:
"${inputText}"

Your task is to extract and structure this information into a comprehensive invoice format. Be intelligent about:
1. Identifying the client/company name and email.
2. Breaking down services into clear line items with descriptions.
3. Calculating appropriate pricing (use reasonable market rates if not specified).
4. Identifying any discounts OR deposits mentioned. Treat deposits as a form of discount.
5. Generating a professional invoice number.

=== RATECALC PRESETS ===
The user has the following saved pricing presets. If the user's request mentions a preset name (or close match) AND provides target dimensions (e.g., "20ft x 10ft", "50 ft by 5 ft"), set that line item's "ratecalc" field with { "preset_id": "<preset id>", "target_width": <number>, "target_height": <number>, "target_unit": "ft" }. Do NOT calculate the quantity yourself — the system auto-calculates from the preset's item dimensions. Set description to the preset name and unit_price to its base_price.

${presets.length > 0 ? presets.map(p => `- ID: ${p.id} | Name: "${p.name}" | Base Price: $${p.base_price} | Unit: ${p.unit_type}${p.item_width ? ` | Item Dims: ${p.item_width}${p.item_dimension_unit} × ${p.item_height}${p.item_dimension_unit}` : ""}`).join('\n') : '(No presets saved)'}

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
                is_discount: { type: "boolean" },
                ratecalc: {
                  type: "object",
                  properties: {
                    preset_id:     { type: "string" },
                    target_width:  { type: "number" },
                    target_height: { type: "number" },
                    target_unit:   { type: "string" }
                  }
                }
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

      // Apply RateCalc: auto-calculate quantity from preset item dimensions
      if (result.line_items && presets.length > 0) {
        result.line_items = result.line_items.map((item) => {
          if (item.ratecalc && item.ratecalc.preset_id) {
            const preset = presets.find(p => p.id === item.ratecalc.preset_id);
            if (preset && preset.item_width && preset.item_height) {
              const fit = calculateFit(preset, item.ratecalc.target_width, item.ratecalc.target_height, item.ratecalc.target_unit || "ft");
              if (fit) {
                return { ...item, quantity: fit.count, unit_price: preset.base_price, detail: fit.detail };
              }
            }
          }
          return item;
        });
      }

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
    setError(null);

    if (!data) {
      setError("No data could be extracted. Please try a different file/image or enter details manually.");
      return;
    }

    const finalData = {
      invoice_number: data.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      client_name: data.client_name || 'Client Name',
      client_email: data.client_email || '',
      invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      line_items: data.line_items || [],
      subtotal: data.subtotal || 0,
      tax_rate: data.tax_rate || 0,
      tax_amount: data.tax_amount || 0,
      discount_amount: data.discount_amount || 0,
      total_amount: data.total_amount || 0,
      notes: data.notes || '',
      template: "modern"
    };

    if (finalData.line_items.length === 0) {
      setError("No line items found. Please add items manually or try a different file/image.");
      return;
    }

    const subtotal = finalData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (finalData.tax_rate / 100);
    const totalAmount = subtotal + taxAmount - (finalData.discount_amount || 0);

    finalData.subtotal = subtotal;
    finalData.tax_amount = taxAmount;
    finalData.total_amount = totalAmount;

    setInvoiceData(finalData);
    speak(`I've extracted the data. Please review the invoice.`);
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

  const resetSession = () => {
    setIsRecording(false);
    setTranscript("");
    setManualInput("");
    setInvoiceData(null);
    setError(null);
    setShowSendModal(false);
    setShowVoiceConversation(false);
    setShowEditor(false);
    setInputMode("voice");
  };

  const getCurrentInput = () => {
    return inputMode === "voice" ? transcript : manualInput;
  };

  const handleProcessClick = () => {
    const inputText = getCurrentInput();
    processCommand(inputText);
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">Thermal Print</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Voice Invoice</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowVoiceConversation(true)}
            className="text-sm"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Chat
          </Button>
        </div>

        {/* Two-column layout: mic + receipt */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Mic + transcript + input modes */}
          <div className="bg-white rounded-xl border-2 border-[#17150f] p-4 md:p-6 shadow-[4px_4px_0_#17150f]">
            <Tabs value={inputMode} onValueChange={setInputMode} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-4 bg-stone-100">
                <TabsTrigger value="voice" className="flex items-center gap-1.5 text-xs">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Voice</span>
                </TabsTrigger>
                <TabsTrigger value="screenshot" className="flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Photo</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
                  <Keyboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Type</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-1.5 text-xs">
                  <FileUp className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <AnimatePresence mode="wait">
              <motion.div
                key={inputMode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {inputMode === "voice" && (
                  <div className="space-y-6">
                    <VoiceSetupGuide />
                    <ThermalMicButton
                      onTranscriptChange={setTranscript}
                      onRecordingChange={setIsRecording}
                      isProcessing={isProcessing}
                    />
                    {transcript && !isProcessing && (
                      <div className="space-y-3">
                        <div className="bg-stone-50 border border-[#17150f]/20 rounded-lg p-3">
                          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500 mb-1">Transcript</p>
                          <p className="font-mono text-sm text-[#17150f] whitespace-pre-wrap">{transcript}</p>
                        </div>
                        <Button
                          onClick={handleProcessClick}
                          disabled={!transcript || isProcessing}
                          className="w-full bg-[#17150f] hover:bg-black text-white"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate Invoice
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {inputMode === "manual" && (
                  <div className="space-y-4">
                    <ManualInput
                      value={manualInput}
                      onChange={setManualInput}
                      isProcessing={isProcessing}
                    />
                    <Button
                      onClick={handleProcessClick}
                      disabled={!manualInput || isProcessing}
                      className="w-full bg-[#17150f] hover:bg-black text-white"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Invoice
                    </Button>
                  </div>
                )}

                {inputMode === "screenshot" && (
                  <ScreenshotInvoiceUploader
                    onDataExtracted={handlePdfDataExtracted}
                    onProcessing={setIsProcessing}
                  />
                )}

                {inputMode === "pdf" && (
                  <PdfInvoiceUploader
                    onDataExtracted={handlePdfDataExtracted}
                    onProcessing={setIsProcessing}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 mt-6 py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
                <p className="text-sm font-semibold text-slate-700">Printing receipt...</p>
              </div>
            )}
          </div>

          {/* Right: Thermal receipt preview + action buttons */}
          <div className="space-y-4">
            <ThermalReceipt invoiceData={invoiceData} isProcessing={isProcessing} />

            {/* Action buttons revealed after total prints */}
            {invoiceData && !isProcessing && (
              <ReceiptActions
                invoiceData={invoiceData}
                onSend={() => setShowSendModal(true)}
                onEdit={() => setShowEditor(true)}
              />
            )}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invoice Editor (revealed when editing) */}
        <AnimatePresence>
          {invoiceData && showEditor && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <InvoiceEditor
                invoiceData={invoiceData}
                onSave={saveInvoiceAsDraft}
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
              onClose={() => setShowVoiceConversation(false)}
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

function ReceiptActions({ invoiceData, onSend, onEdit }) {
  // Reveal after the receipt has finished printing (client + items + total)
  const lineCount = 1 + (invoiceData.line_items?.length || 0);
  const revealDelay = lineCount * 300 + 500;

  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), revealDelay);
    return () => clearTimeout(t);
  }, [revealDelay]);

  if (!shown) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3"
    >
      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
        <Send className="w-4 h-4 mr-2" />
        Send + Pay Link
      </Button>
      <Button variant="outline" className="flex-1 border-[#17150f] text-[#17150f] hover:bg-stone-100" onClick={onEdit}>
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </Button>
    </motion.div>
  );
}