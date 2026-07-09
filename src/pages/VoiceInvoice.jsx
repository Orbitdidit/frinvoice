import { useState, useRef, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { PricingPreset } from "@/entities/PricingPreset";
import { calculateFit } from "@/lib/rateCalc";
import { InvokeLLM } from "@/integrations/Core";
import { Zap, Send, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ThermalMicButton from "../components/voice/ThermalMicButton";
import ThermalReceipt from "../components/invoices/ThermalReceipt";
import InvoiceEditor from "../components/invoices/InvoiceEditor";
import SendConfirmationModal from "../components/invoices/SendConfirmationModal";
import VoiceConversation from "../components/voice/VoiceConversation";

const EXAMPLE_COMMANDS = [
  "Invoice ABC Corp for website design, $2,500",
  "Bill John Smith 5 hours consulting at $150/hr",
  "Estimate for Exotic Pop, LED wall install, $88,000",
];

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [presets, setPresets] = useState([]);
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
    if (wasRecording.current && !isRecording && transcript.trim()) {
      processCommand(transcript);
    }
    wasRecording.current = isRecording;
  }, [isRecording, transcript]);

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
    setInvoiceData(null);
    setError(null);
    setShowSendModal(false);
    setShowVoiceConversation(false);
    setShowEditor(false);
  };

  return (
    <div className="min-h-screen bg-money-paper p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1
              className="title-underline font-heading font-black text-ink leading-none"
              style={{ fontSize: 46, letterSpacing: "-0.04em" }}
            >
              THE VOX
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowVoiceConversation(true)}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Chat
          </Button>
        </div>

        {/* Two-column layout: SPEAK + THE PRINTER */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT — SPEAK panel */}
          <div className="bg-card rounded-md border-2 border-ink p-6 md:p-8 shadow-hard">
            <p className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-ink mb-6">Speak</p>
            <ThermalMicButton
              onTranscriptChange={setTranscript}
              onRecordingChange={setIsRecording}
              isProcessing={isProcessing}
            />
          </div>

          {/* RIGHT — THE PRINTER panel */}
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

        {/* Example chips as paper pills */}
        {!invoiceData && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {EXAMPLE_COMMANDS.map((cmd) => (
              <span
                key={cmd}
                className="inline-block px-4 py-2 rounded-full border-2 border-ink bg-paper text-ink text-xs font-mono font-medium shadow-[2px_2px_0_#17150f] transition-colors hover:bg-money hover:text-white cursor-default"
              >
                "{cmd}"
              </span>
            ))}
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="rounded-md border-2 border-stamp bg-stamp/10 p-4 shadow-hard-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1 text-sm font-mono text-ink">{error}</span>
                <Button variant="signal" size="sm" onClick={() => setError(null)}>
                  TRY AGAIN
                </Button>
              </div>
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
      className="flex gap-3 max-w-sm mx-auto md:mx-0"
    >
      <Button variant="money" className="flex-1" onClick={onSend}>
        <Send className="w-4 h-4 mr-2" />
        Send + Pay Link
      </Button>
      <Button variant="outline" className="flex-1" onClick={onEdit}>
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </Button>
    </motion.div>
  );
}