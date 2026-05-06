import React, { useState, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { base44 } from "@/api/base44Client";
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

// ── helpers ──────────────────────────────────────────────────────────────────
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getNet30Str() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function genInvoiceNumber() {
  return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

/** Recompute all math from sanitised line items — never trust AI math */
function sanitiseAndRecalc(raw) {
  const data = { ...raw };

  // Coerce line item numbers
  data.line_items = (data.line_items || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const computedTotal = item.is_discount ? -Math.abs(Number(item.total) || price * qty) : qty * price;
    return {
      ...item,
      quantity: qty,
      unit_price: price,
      total: computedTotal,
      is_discount: !!item.is_discount,
      file_urls: item.file_urls || [],
    };
  });

  const subtotal = data.line_items.reduce(
    (sum, item) => sum + (item.is_discount ? 0 : item.total),
    0
  );
  const discountAmount = data.line_items.reduce(
    (sum, item) => sum + (item.is_discount ? Math.abs(item.total) : 0),
    0
  );
  const taxRate = Number(data.tax_rate) || 0;
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);

  data.subtotal = subtotal;
  data.discount_amount = discountAmount;
  data.tax_rate = taxRate;
  data.tax_amount = taxAmount;
  data.total_amount = subtotal - discountAmount + taxAmount;
  data.template = data.template || "modern";
  data.document_type = data.document_type || "invoice";

  return data;
}

// ── main component ────────────────────────────────────────────────────────────
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

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const clientData = await Client.list();
      setClients(clientData);
    } catch (e) {
      console.error("Error loading clients:", e);
    }
  };

  const createBlankInvoice = () => ({
    invoice_number: genInvoiceNumber(),
    po_number: "",
    document_type: "invoice",
    client_name: "",
    client_email: "",
    invoice_date: getTodayStr(),
    due_date: getNet30Str(),
    line_items: [{ description: "", detail: "", quantity: 1, unit_price: 0, total: 0, is_discount: false, file_urls: [] }],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    discount_amount: 0,
    deposit_amount: 0,
    total_amount: 0,
    notes: "",
    template: "modern",
    status: "draft",
  });

  const handleInputModeChange = (mode) => {
    if (mode === "editor") {
      setIsAiGenerated(false);
      setInvoiceData(createBlankInvoice());
    } else {
      setInvoiceData(null);
      setInputMode(mode);
    }
  };

  // ── UPGRADED processCommand ────────────────────────────────────────────────
  const processCommand = async (inputText) => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setError(null);

    // Pre-compute dates & invoice number in JS — AI copies them verbatim
    const todayStr = getTodayStr();
    const net30Str = getNet30Str();
    const invoiceNum = genInvoiceNumber();

    const prompt = `
You are Frinvoice AI — an elite billing assistant. Return a perfectly structured JSON invoice. Populate every field possible.

TODAY'S DATE: ${todayStr}
DEFAULT DUE DATE (Net 30): ${net30Str}
DEFAULT INVOICE NUMBER: ${invoiceNum}

USER REQUEST:
"""
${inputText}
"""

=== CRITICAL PARSING RULES ===

RULE 1 — STRUCTURED PROMPT DETECTION:
If the user's request contains labeled sections like "FROM:", "VENDOR:", "BILL TO:", "INVOICE DETAILS:", "LINE ITEM:", "PURCHASE ORDER:", "PO #:", "NOTES:", or "Attention:", you MUST extract every value EXACTLY as written. Do not paraphrase. Do not round numbers. Do not change names. Do not generate new values when the user has provided their own.

RULE 2 — FROM/VENDOR is the user's OWN business — IGNORE for client fields:
The vendor info comes from the user's saved Settings, not the prompt. NEVER place vendor info into client_name, client_email, client_phone, or client_address.

RULE 3 — BILL TO is the CLIENT:
Extract the BILL TO section into client_* fields:
- The organization being billed -> client_name AND client_company
- The person in "Attention:", "Attn:", or "Contact:" -> client_contact_person
- Any provided address -> client_address
- Skip placeholders like "[Insert address]" or "[Use X address from PO]" — leave that field as empty string ""

RULE 4 — EXPLICIT VALUES OVERRIDE DEFAULTS (THIS IS CRITICAL):
- If user provides "Invoice Number: ODF-ROAR-001" -> invoice_number = "ODF-ROAR-001". Do NOT use the default "${invoiceNum}".
- If user provides "Invoice Date: 05/06/2026" -> invoice_date = "2026-05-06" (convert MM/DD/YYYY to YYYY-MM-DD). Do NOT use today's date.
- If user provides "Net 30" terms -> calculate due_date as 30 days after the user-provided invoice_date. Do NOT use the default.
- If user provides "Net 15" terms -> calculate due_date as 15 days after the user-provided invoice_date.
- The defaults (${invoiceNum}, ${todayStr}, ${net30Str}) are ONLY fallbacks for when the user provided NOTHING explicit.

RULE 4b — PURCHASE ORDER vs INVOICE NUMBER (CRITICAL — these are different fields):
- invoice_number: The seller's own reference number (e.g., "ODF-ROAR-001", "INV-2026-0042"). This is YOUR invoice number.
- po_number: The BUYER's purchase order number (e.g., "P0191570", "PO-12345"). This is the CLIENT's reference number.
- NEVER put a PO number into invoice_number. NEVER put an invoice number into po_number.
- If the user provides "Invoice Number: ODF-ROAR-001" -> invoice_number = "ODF-ROAR-001"
- If the user provides "PO #: P0191570" or "Purchase Order: P0191570" or "PO Number: P0191570" -> po_number = "P0191570"
- If the invoice title says "Invoice for PO # P0191570" -> po_number = "P0191570", and invoice_number uses the user's provided value or the default
- Both fields can be populated at the same time
- If no PO number is mentioned -> po_number = ""

RULE 5 — PURCHASE ORDER PRESERVATION:
If the prompt mentions a PO number anywhere:
1. Set po_number = that exact PO number (digits/letters only, no "PO #" prefix)
2. The notes field MUST also start with: "Please reference Purchase Order # [PO_NUMBER] on all payment processing."

RULE 6 — LINE ITEMS:
- description: Short professional label (60-80 chars max)
- detail: Full scope using the user's exact wording when they provide detailed descriptions
- unit_price: Use exact numeric amount the user provided. "$9,550.00" becomes 9550. NEVER round.
- total: quantity x unit_price
- is_discount: true ONLY for deposits, discounts, credits

RULE 7 — NOTES:
- If user provided a "NOTES:" section, use their exact wording
- If a PO is referenced, prepend the "Please reference Purchase Order #" line above their notes
- If user provided "Payment Terms" (e.g., "Net 30 / Per TSU Purchase Order Terms"), preserve those exact terms in notes
- If user provided no notes at all, write 2-3 lines of professional payment terms ending with a thank-you line

=== STANDARD RULES (for unstructured/conversational prompts) ===

CLIENT FIELDS — extract or leave as empty string "":
- client_name, client_company, client_contact_person, client_email, client_phone, client_address

DOCUMENT TYPE:
- "estimate" if user says quote/estimate/bid/proposal, else "invoice"

RATES (only when no price given):
- Creative/Design: $75-$150/hr
- Video/Film: $150-$300/hr
- Web/App dev: $100-$200/hr
- Consulting: $150-$250/hr
- AI/Tech consulting: $150-$300/hr
- Installation: $75-$125/hr

TAX:
- tax_rate: 0 unless user explicitly states a tax rate

TOTALS (always compute):
- subtotal: Sum of non-discount line items
- discount_amount: Absolute value of discount/deposit lines
- tax_amount: (subtotal - discount_amount) x (tax_rate / 100)
- total_amount: subtotal - discount_amount + tax_amount

OUTPUT: Return ONLY valid JSON matching the schema. No markdown. No backticks. No explanation.
`;

    const invoiceSchema = {
      type: "object",
      properties: {
        invoice_number:        { type: "string" },
        po_number:             { type: "string" },
        document_type:         { type: "string" },

        client_name:           { type: "string" },
        client_company:        { type: "string" },
        client_contact_person: { type: "string" },
        client_email:          { type: "string" },
        client_phone:          { type: "string" },
        client_address:        { type: "string" },
        invoice_date:          { type: "string" },
        due_date:              { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              detail:      { type: "string" },
              quantity:    { type: "number" },
              unit_price:  { type: "number" },
              total:       { type: "number" },
              is_discount: { type: "boolean" },
            },
          },
        },
        subtotal:         { type: "number" },
        discount_amount:  { type: "number" },
        tax_rate:         { type: "number" },
        tax_amount:       { type: "number" },
        total_amount:     { type: "number" },
        notes:            { type: "string" },
        voice_transcript: { type: "string" },
      },
    };

    try {
      const raw = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: invoiceSchema,
      });

      // Use AI-extracted values when present; fall back to JS-computed defaults only when missing
      raw.invoice_number   = raw.invoice_number   || invoiceNum;
      raw.invoice_date     = raw.invoice_date     || todayStr;
      raw.due_date         = raw.due_date         || net30Str;
      raw.po_number        = raw.po_number        || '';
      raw.voice_transcript = inputText;

      const result = sanitiseAndRecalc(raw);
      setIsAiGenerated(true);
      setInvoiceData(result);
    } catch (e) {
      console.error("Error processing command:", e);
      setError("Failed to process your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfDataExtracted = (data) => {
    setError(null);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      setError("The AI could not extract any usable invoice data from the document.");
      return;
    }
    const extractedData = Array.isArray(data) ? data[0] : data;
    if (!extractedData.line_items || extractedData.line_items.length === 0) {
      setError("The AI could not identify any line items. Please check the file or enter manually.");
      return;
    }
    const finalData = sanitiseAndRecalc({
      ...extractedData,
      invoice_date: extractedData.invoice_date || getTodayStr(),
    });
    setIsAiGenerated(true);
    setInvoiceData(finalData);
  };

  const saveAndClose = async (dataToSave) => {
    if (!dataToSave) return;
    try {
      if (dataToSave.client_name) {
        const existing = await Client.filter({ name: dataToSave.client_name });
        if (existing.length === 0) {
          await Client.create({
            name: dataToSave.client_name,
            email: dataToSave.client_email || "",
            phone: dataToSave.client_phone || "",
            company: dataToSave.client_company || "",
          });
          await loadClients();
        }
      }
      const newInvoice = await Invoice.create({ ...dataToSave, status: "draft" });
      navigate(createPageUrl(`InvoiceDetail?id=${newInvoice.id}`));
    } catch (e) {
      console.error("Error saving invoice:", e);
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

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0A0A0F" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

          {/* ── Hero header ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
            {/* Outer glow layer */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-600/30 via-fuchsia-500/20 to-cyan-500/20 blur-xl" />
            <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-center gap-4">
                {/* Logo with glow halo */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 blur-lg opacity-70" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Wand2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                    Create Invoice
                  </h1>
                  <p className="text-xs text-cyan-300/70 font-semibold tracking-widest uppercase mt-1">
                    Powered by Frinvoice AI
                  </p>
                </div>
              </div>
              <p className="text-slate-300/80 text-lg max-w-2xl mx-auto leading-relaxed">
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
                className="space-y-4"
              >
                {/* Input card */}
                <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Tabs */}
                  <div className="p-4 border-b border-white/10">
                    <Tabs value={inputMode} onValueChange={handleInputModeChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-5 bg-black/40 border border-white/5 p-1 rounded-xl">
                        {[
                          { value: "editor",     icon: <Edit className="w-4 h-4" />,     label: "Editor" },
                          { value: "ai",         icon: <Sparkles className="w-4 h-4" />, label: "AI Text" },
                          { value: "voice",      icon: <Mic className="w-4 h-4" />,      label: "Voice" },
                          { value: "screenshot", icon: <Camera className="w-4 h-4" />,   label: "📸" },
                          { value: "pdf",        icon: <FileUp className="w-4 h-4" />,   label: "PDF" },
                        ].map((tab) => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-1.5 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all"
                          >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Tab content */}
                  <div className="p-6 space-y-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={inputMode}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {inputMode === "ai" && (
                          <div className="space-y-6">
                            <ManualInput
                              value={manualInput}
                              onChange={setManualInput}
                              isProcessing={isProcessing}
                            />
                            <div className="flex justify-center">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                  onClick={() => processCommand(manualInput)}
                                  disabled={!manualInput || isProcessing}
                                  className="px-10 py-6 rounded-2xl text-base font-semibold tracking-wide bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 hover:from-purple-500 hover:via-fuchsia-400 hover:to-cyan-400 text-white shadow-2xl border-0"
                                >
                                  {isProcessing ? (
                                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                                  ) : (
                                    <><Sparkles className="w-5 h-5 mr-2" />Generate Invoice with AI</>
                                  )}
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        )}

                        {inputMode === "voice" && (
                          <div className="space-y-6">
                            <VoiceSetupGuide />
                            <VoiceRecorder
                              onTranscriptChange={setTranscript}
                              onRecordingChange={setIsRecording}
                              isProcessing={isProcessing}
                            />
                            {transcript && !isProcessing && (
                              <div className="flex flex-col items-center gap-4">
                                <VoiceTranscript transcript={transcript} isProcessing={isProcessing} />
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                  <Button
                                    onClick={() => processCommand(transcript)}
                                    disabled={!transcript || isProcessing}
                                    className="px-10 py-6 rounded-2xl text-base font-semibold tracking-wide bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 hover:from-purple-500 hover:via-fuchsia-400 hover:to-cyan-400 text-white shadow-2xl border-0"
                                  >
                                    <Wand2 className="w-5 h-5 mr-2" />Generate from Voice
                                  </Button>
                                </motion.div>
                              </div>
                            )}
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

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="flex flex-col items-center justify-center text-center py-4 gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-xl scale-150" />
                          <RefreshCw className="relative w-10 h-10 animate-spin text-cyan-400" />
                        </div>
                        <p className="text-white font-semibold text-lg">Processing your request…</p>
                        <p className="text-cyan-300/70 text-sm">Frinvoice AI is generating your invoice.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tips / examples panel */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    {inputMode === "editor"     && "Manual Editor"}
                    {inputMode === "ai"         && "AI Assistant Examples"}
                    {inputMode === "voice"      && "Voice Command Tips"}
                    {inputMode === "screenshot" && "Screenshot to Invoice"}
                    {inputMode === "pdf"        && "PDF Upload"}
                  </h3>
                  <div className="space-y-2 text-sm text-slate-300/80">
                    {inputMode === "editor" && (
                      <>
                        <p>→ Use the full-featured editor to build your invoice from scratch.</p>
                        <p>› Add line items, upload images, set discounts, and more.</p>
                        <p>→ Perfect for maximum control over every detail.</p>
                      </>
                    )}
                    {inputMode === "ai" && (
                      <>
                        <p>→ <em>"Invoice Bayou Bites for 50 plates of jambalaya at $18 each, 2 hrs on-site at $75/hr, $200 deposit paid."</em></p>
                        <p>› <em>"Create an estimate for ABC Corp — logo design, 10 hours, contact is Sarah Lee sarah@abc.com"</em></p>
                        <p>→ <em>"Bill Exotic Pop for LED wall installation $88,000 — 50% deposit already paid"</em></p>
                      </>
                    )}
                    {inputMode === "voice" && (
                      <>
                        <p>🎤 <em>"Create an invoice for ABC Company for website work"</em></p>
                        <p>🎤 <em>"Bill John Smith for 5 hours of consulting at $150 per hour"</em></p>
                        <p>🎤 <em>"Invoice for LED display installation, $50,000"</em></p>
                      </>
                    )}
                    {inputMode === "screenshot" && (
                      <>
                        <p>→ Upload a screenshot or photo of any receipt, invoice, or quote</p>
                        <p>› Frinvoice AI extracts all data instantly — no manual typing needed</p>
                        <p>→ Perfect for converting photos into professional invoices in seconds</p>
                      </>
                    )}
                    {inputMode === "pdf" && (
                      <>
                        <p>→ Upload existing PDF invoices or quotes to convert them</p>
                        <p>› AI extracts all relevant data automatically</p>
                        <p>→ Perfect for converting old invoices to the new format</p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
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
    </div>
  );
}