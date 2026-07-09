import { useState, useRef, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { PricingPreset } from "@/entities/PricingPreset";
import { calculateFit } from "@/lib/rateCalc";
import { InvokeLLM } from "@/integrations/Core";
import { Zap, Send, Edit, Eye } from "lucide-react";
import { User as UserEntity } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ThermalMicButton from "../components/voice/ThermalMicButton";
import ThermalReceipt from "../components/invoices/ThermalReceipt";
import InvoiceEditor from "../components/invoices/InvoiceEditor";
import SendConfirmationModal from "../components/invoices/SendConfirmationModal";
import VoiceDebugPanel from "../components/voice/VoiceDebugPanel";
import ShowpieceOverlay from "../components/invoices/ShowpieceOverlay";

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
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Debug mode — tap the INVOX THERMAL header 5x to reveal
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState({});
  const headerTapsRef = useRef(0);
  const headerTapTimerRef = useRef(null);

  useEffect(() => {
    loadClients();
    loadPresets();
    UserEntity.me().then(setCompanyInfo).catch(() => {});
  }, []);

  const handleHeaderTap = () => {
    headerTapsRef.current += 1;
    if (headerTapTimerRef.current) clearTimeout(headerTapTimerRef.current);
    headerTapTimerRef.current = setTimeout(() => {
      headerTapsRef.current = 0;
    }, 1500);
    if (headerTapsRef.current >= 5) {
      headerTapsRef.current = 0;
      setShowDebug((s) => !s);
    }
  };

  const mergeDebug = (patch) => setDebugData((prev) => ({ ...prev, ...patch }));

  // Called by the mic button ONLY after transcription completes.
  // append=true means the user tapped "add more" — combine with prior transcript.
  const handleTranscriptReady = (text, { append } = {}) => {
    const combined = append && transcript.trim() ? `${transcript.trim()} ${text.trim()}` : text.trim();
    setTranscript(combined);
    mergeDebug({ rawTranscript: combined, parseStatus: "parsing…" });
    processCommand(combined);
  };

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
      const clientNames = clients.map((c) => c.name).filter(Boolean);
      const prompt = `
You are INVOX, an AI that converts spoken natural-language requests into detailed, professional invoices or estimates.

The user SPOKE this out loud (it may be a long run-on sentence with several items):
"${inputText}"

=== EXTRACTION RULES — read carefully ===
1. DOCUMENT TYPE: If the user said "estimate", "quote", or "proposal", set document_type to "estimate". Otherwise "invoice".
2. CLIENT: Extract the client/company name, and email/phone if spoken. Existing clients: [${clientNames.map((n) => `"${n}"`).join(", ") || "none"}]. If the spoken name closely matches one of these (ignoring case, "inc/llc/corp", minor misspellings), use the EXACT existing spelling.
3. ONE LINE ITEM PER DISTINCT ITEM/SERVICE. Never merge two different things into one line. If the user lists "logo design, a website, and business cards", that is THREE separate line items — one each.
4. QUANTITIES & UNIT PRICE: Capture explicit quantities ("3 banners", "5 panels"). total = quantity × unit_price.
5. HOURLY WORK: "5 hours consulting at $150/hr" → quantity=5, unit_price=150, description mentions the hourly rate, total=750.
6. DEPOSITS: "half deposit", "50% deposit paid", "$500 deposit down" → a SEPARATE line item, description "Deposit", is_discount=true, and total NEGATIVE. For percentage deposits ("half", "50%"), compute the amount from the sum of the positive line items.
7. DISCOUNTS: any "10% off", "$200 discount" → separate line item, is_discount=true, NEGATIVE total.
8. If a price for an item isn't spoken, use a reasonable industry rate — but never drop an item the user mentioned.
9. Generate invoice_number (format INV-YYYY-XXXX). invoice_date = today. due_date = 30 days out unless the user said otherwise.
10. Use clean professional wording for each description; keep the user's own detail in the "detail" field where useful.

=== RATECALC PRESETS ===
The user has the following saved pricing presets. If the user's request mentions a preset name (or close match) AND provides target dimensions (e.g., "20ft x 10ft", "50 ft by 5 ft"), set that line item's "ratecalc" field with { "preset_id": "<preset id>", "target_width": <number>, "target_height": <number>, "target_unit": "ft" }. Do NOT calculate the quantity yourself — the system auto-calculates from the preset's item dimensions. Set description to the preset name and unit_price to its base_price.

${presets.length > 0 ? presets.map(p => `- ID: ${p.id} | Name: "${p.name}" | Base Price: $${p.base_price} | Unit: ${p.unit_type}${p.item_width ? ` | Item Dims: ${p.item_width}${p.item_dimension_unit} × ${p.item_height}${p.item_dimension_unit}` : ""}`).join('\n') : '(No presets saved)'}

Return the invoice data in the exact JSON structure specified. Double-check: count the distinct items the user named and make sure you produced that many positive line items (plus any deposit/discount lines).
`;

      const invoiceSchema = {
        type: "object",
        properties: {
          document_type: { type: "string", enum: ["invoice", "estimate"] },
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
      result.document_type = result.document_type === "estimate" ? "estimate" : "invoice";

      // Fuzzy-link to an existing client (case/suffix/whitespace-insensitive)
      if (result.client_name && clients.length > 0) {
        const norm = (s) =>
          (s || "").toLowerCase().replace(/\b(inc|llc|corp|ltd|co)\b\.?/g, "").replace(/[^a-z0-9]/g, "").trim();
        const target = norm(result.client_name);
        const match = clients.find((c) => {
          const n = norm(c.name);
          return n && target && (n === target || n.includes(target) || target.includes(n));
        });
        if (match) {
          result.client_name = match.name;
          result.client_email = result.client_email || match.email || "";
          result.client_phone = result.client_phone || match.phone || "";
        }
      }

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

      mergeDebug({ parseStatus: "success", lineItemCount: result.line_items?.length || 0 });
      setInvoiceData(result);
      const docWord = result.document_type === "estimate" ? "estimate" : "invoice";
      speak(`I've generated the ${docWord} for ${result.client_name}. Would you like to review it?`);
      setShowSendModal(false);

    } catch (error) {
      console.error("Error processing command:", error);
      mergeDebug({ parseStatus: "FAILED: " + (error.message || "unknown") });
      // Never discard the transcript — keep it so the user can retry parsing.
      setError("Couldn't turn that into an invoice — your words are saved below. Tap “Try parsing again”.");
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
    setShowEditor(false);
    setShowPreview(false);
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
        </div>

        {/* Two-column layout: SPEAK + THE PRINTER */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT — SPEAK panel */}
          <div className="bg-card rounded-md border-2 border-ink p-6 md:p-8 shadow-hard space-y-6">
            <p className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-ink">Speak</p>
            <ThermalMicButton
              key={invoiceData ? "append" : "fresh"}
              onTranscriptReady={handleTranscriptReady}
              onRecordingChange={setIsRecording}
              onDebug={mergeDebug}
              isProcessing={isProcessing}
              appendMode={!!invoiceData}
            />

            {/* Transcript safety net — keeps your words even if parsing fails */}
            {transcript && (
              <div className="rounded-md border-2 border-ink bg-paper p-4 space-y-3">
                <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-ink/50">You said</p>
                <p className="font-mono text-sm text-ink whitespace-pre-wrap leading-relaxed">{transcript}</p>
                {error && (
                  <Button variant="signal" size="sm" onClick={() => processCommand(transcript)} disabled={isProcessing}>
                    <Zap className="w-4 h-4 mr-2" />
                    Try parsing again
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — THE PRINTER panel */}
          <div className="space-y-4">
            <ThermalReceipt invoiceData={invoiceData} isProcessing={isProcessing} onHeaderTap={handleHeaderTap} />

            {showDebug && <VoiceDebugPanel debug={debugData} onClose={() => setShowDebug(false)} />}

            {/* Action buttons revealed after total prints */}
            {invoiceData && !isProcessing && (
              <ReceiptActions
                invoiceData={invoiceData}
                onPreview={() => setShowPreview(true)}
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

        <SendConfirmationModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          invoiceData={invoiceData}
          onSaveDraft={saveInvoiceAsDraft}
        />
      </div>

      {showPreview && invoiceData && (
        <ShowpieceOverlay
          invoice={invoiceData}
          business={companyInfo}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function ReceiptActions({ invoiceData, onPreview, onSend, onEdit }) {
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
      className="space-y-3 max-w-sm mx-auto md:mx-0"
    >
      <Button variant="outline" className="w-full font-mono uppercase tracking-[0.12em] shadow-hard" onClick={onPreview}>
        <Eye className="w-4 h-4 mr-2" />
        Preview Showpiece
      </Button>
      <div className="flex gap-3">
        <Button variant="money" className="flex-1" onClick={onSend}>
          <Send className="w-4 h-4 mr-2" />
          Send + Pay Link
        </Button>
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>
    </motion.div>
  );
}