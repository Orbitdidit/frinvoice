/**
 * 🚀 FRINVOICE - COMPLETE APP SCHEMA & DOCUMENTATION
 * AI-Powered Invoice Management Platform
 * Last Updated: December 27, 2025
 * 
 * =============================================================================
 * SHARE THIS WITH YOUR DEVELOPER FOR DEEP VOICE DEBUGGING
 * =============================================================================
 */

export const FRINVOICE_SCHEMA = `

# 🚀 Frinvoice - Complete App Schema & Documentation

**AI-Powered Invoice Management Platform**  
Last Updated: December 27, 2025

---

## 📋 TABLE OF CONTENTS
1. Overview
2. Core Features
3. Database Entities
4. Voice/Speech AI System (CRITICAL)
5. Payment Integration
6. Pages & Routes
7. Backend Functions
8. Technical Stack
9. Critical Issues & Debugging

---

## 🎯 OVERVIEW

Frinvoice is a next-generation invoicing platform that combines traditional invoice 
management with cutting-edge AI voice capabilities. Users can create professional 
invoices by simply speaking naturally, as if talking to a friend.

**Tagline:** "Your AI assistant friend helping you make invoices"

---

## ✨ CORE FEATURES

### 1. AI Voice Invoice Creation 🎤
- Natural Language Processing: "Invoice John Smith for logo design, 5 hours at $150/hour"
- Multi-Service Voice Recognition:
  * AssemblyAI (Free tier - 5 hours/month)
  * OpenAI Whisper (Fallback)
  * Browser Native STT (Offline fallback)
- Real-time Transcription
- Smart Invoice Generation with entity extraction
- Conversational Voice Chat (Advanced)

### 2. Multiple Invoice Creation Methods 📄
- Voice Commands
- AI Text Input
- Manual Editor (drag-and-drop)
- PDF Upload (convert existing invoices)
- Screenshot/Photo (snap receipts)

### 3. Professional Invoice Management 💼
- Dual Document Types: Invoices & Estimates
- Multiple Templates: Modern gradient or Classic
- Status Tracking: Draft, Sent, Viewed, Paid, Overdue
- Client Management CRM
- Line Item Features:
  * Drag-and-drop reordering
  * Image attachments per item
  * Discounts and deposits (negative items)
  * Automatic calculations

### 4. Payment Processing 💳
- Stripe Integration (direct payment links)
- Multi-User Payment Config (bring your own keys)
- Public Invoice Links (shareable)
- Payment Status Tracking (webhooks)
- Success/Cancel Pages

### 5. Smart Features 🧠
- Pricing Presets (SmartCalc™)
- Company Branding (logo, terms)
- Print/PDF Export
- Mobile Responsive PWA
- Dashboard Analytics

---

## 🗄️ DATABASE ENTITIES

### Invoice (Main Entity)
{
  "document_type": "invoice | estimate",
  "invoice_number": "string (unique)",
  "client_name": "string",
  "client_email": "email",
  "status": "draft | sent | viewed | paid | overdue | cancelled | accepted | declined",
  "invoice_date": "date",
  "due_date": "date",
  "subtotal": "number",
  "discount_amount": "number",
  "deposit_amount": "number",
  "tax_rate": "number",
  "tax_amount": "number",
  "total_amount": "number",
  "payment_method": "pending | credit_card | bank_transfer | paypal | other",
  "payment_status": "unpaid | pending | paid | refunded",
  "line_items": [
    {
      "description": "string",
      "quantity": "number",
      "unit_price": "number",
      "total": "number",
      "file_urls": ["string"],
      "is_discount": "boolean"
    }
  ],
  "notes": "string",
  "voice_transcript": "string (original voice command)",
  "template": "modern | classic",
  "project_hero_image_url": "string"
}

### Client
{
  "name": "string",
  "email": "email",
  "phone": "string",
  "company": "string",
  "total_invoices": "number",
  "total_revenue": "number",
  "payment_terms": "net_15 | net_30 | net_45"
}

### PaymentConfig
{
  "stripe_publishable_key": "string",
  "stripe_secret_key": "string",
  "is_active": "boolean"
}

### PricingPreset
{
  "name": "string",
  "category": "design | video | print | installation | consultation",
  "unit_type": "per_hour | per_piece | per_sqft | per_linear_ft | flat_rate",
  "base_price": "number"
}

---

## 🎤 VOICE/SPEECH AI SYSTEM (CRITICAL FOR DEBUGGING)

### Architecture Overview
Multi-tier fallback strategy:
1. PRIMARY: AssemblyAI (Free 5hrs/month, high accuracy)
2. FALLBACK 1: OpenAI Whisper (Paid, very reliable)
3. FALLBACK 2: Browser Native Speech Recognition (Offline)

### Key Voice Components

**VoiceRecorder.js** (components/voice/VoiceRecorder.js)
- Handles microphone access and recording
- Cross-browser audio capture (WebM, MP4, M4A)
- Real-time status indicators
- iPhone/Safari compatibility fixes

**VoiceTranscript.js** (components/voice/VoiceTranscript.js)
- Displays transcribed text
- Shows processing status

**ManualInput.js** (components/voice/ManualInput.js)
- Text fallback for voice
- Character counter

**VoiceSetupGuide.js** (components/voice/VoiceSetupGuide.js)
- Permission status checker
- Browser-specific instructions

### Backend Voice Functions

**transcribeAudioSimple.js** (PRIMARY - MOST IMPORTANT)
Location: functions/transcribeAudioSimple.js

Critical Implementation:

// 1. Auth Check
const base44 = createClientFromRequest(req);
const user = await base44.auth.me();
if (!user) return 401;

// 2. File Processing
const audioFile = formData.get('audio');
const safeName = audioFile.name || 'recording.m4a';
const safeType = audioFile.type || 'audio/mp4';

// 3. AssemblyAI Flow
- Upload audio
- Create transcription job  
- Poll for completion (max 40s)
- Return transcript

// 4. OpenAI Whisper Fallback
- Normalize filename with extension
- Send to OpenAI API
- Return transcript

API Keys Required:
- ASSEMBLY_AI_KEY (primary)
- OPENAI_API_KEY (fallback)

**voiceConversation.js** (ADVANCED)
Location: functions/voiceConversation.js

Full duplex voice chat:
- OpenAI Whisper (STT)
- GPT-4o-mini (Chat)
- ElevenLabs (TTS)
- Returns audio response

API Keys:
- OPENAI_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID (optional)

### Voice Flow Example

USER JOURNEY:
1. User taps mic button in CreateInvoice
2. Browser requests mic permission
3. User speaks: "Invoice ABC Corp, logo design, $500"
4. VoiceRecorder captures audio Blob
5. Audio sent to transcribeAudioSimple
6. Backend tries AssemblyAI → OpenAI
7. Returns: { transcript: "...", service: "AssemblyAI" }
8. Frontend shows transcript
9. User clicks "Generate from Voice"
10. AI processes → structured invoice
11. InvoiceEditor opens with data

### Voice Issues & Fixes

❌ Issue: "500 Error" on iPhone/Safari
Root Cause:
- iPhone records as audio/mp4 or audio/x-m4a
- Missing file extensions
- OpenAI requires proper extension

✅ Fix Applied (Dec 27, 2025):
let fileName = audioFile.name || 'recording.mp4';
if (!fileName.includes('.')) {
  fileName += '.mp4';
}
openaiForm.append('file', audioFile, fileName);

❌ Issue: AssemblyAI quota
Solution:
- Free tier = 5 hours/month (300 minutes)
- ~150-300 invoice creations
- Auto-fallback to OpenAI

✅ Browser Fallback Working
- Chrome/Safari Native STT
- Works offline, no API keys
- Triggered when server fails

### DEBUGGING VOICE ISSUES

For Your Developer:

1. Test Audio Recording in Browser Console:
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const recorder = new MediaRecorder(stream);
    console.log('MIME Type:', recorder.mimeType);
    console.log('WebM Support:', MediaRecorder.isTypeSupported('audio/webm'));
  });

2. Check Backend Logs:
- Dashboard → Code → Functions → transcribeAudioSimple
- Look for: "🎵 Received: ..."
- Check for: "✅ AssemblyAI Success" or errors

3. Test API Keys Directly:
# AssemblyAI
curl -X POST https://api.assemblyai.com/v2/upload \\
  -H "authorization: YOUR_KEY" \\
  -F "audio=@test.mp3"

# OpenAI Whisper
curl -X POST https://api.openai.com/v1/audio/transcriptions \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -F file=@test.mp3 \\
  -F model=whisper-1

4. Frontend Debugging:
- Browser console errors
- Network tab → /functions/transcribeAudioSimple
- Inspect request payload (FormData with 'audio')

5. Common Failure Points:
❌ Empty audio (< 100 bytes) - User didn't speak
❌ Auth failure - Session expired
❌ API quota exceeded - Free tier maxed
❌ Invalid API keys - Check secrets
❌ CORS issues - Headers incorrect

---

## 💳 PAYMENT INTEGRATION

Stripe Setup:
- Mode: Multi-tenant (each user has own keys)
- Flow: Settings → Payments → Add Stripe keys
- Storage: PaymentConfig entity (user-scoped)

Payment Flow:
1. User creates invoice
2. Send invoice → email with public link
3. Client opens PublicInvoice page
4. Click "Pay Now"
5. PayNowButton → createCheckoutSession
6. Backend creates Stripe checkout
7. Redirect to Stripe
8. Payment complete → webhook → invoice = paid
9. Client sees PaymentSuccess

Backend Payment Functions:
- createCheckoutSession.js - Generate checkout
- verifyStripeSession.js - Verify payment
- handleStripeWebhook.js - Process webhooks

---

## 📄 PAGES & ROUTES

Public (No Auth):
- PublicInvoice - Public view + payment
- PaymentSuccess - Confirmation
- PaymentCancelled - Cancelled message

Authenticated:
- Dashboard - Stats, recent invoices
- CreateInvoice - Multi-modal creation
- VoiceInvoice - Voice conversation
- Invoices - List invoices
- Estimates - List estimates
- InvoiceDetail - View/edit/share
- Clients - CRM
- Settings - Company, Stripe, presets

Layout.js:
- Desktop sidebar with live stats
- Mobile bottom navigation
- PWA manifest injection
- Auth bypass for public pages

---

## ⚙️ BACKEND FUNCTIONS

Invoice:
- getPublicInvoice - Fetch without auth

Payment:
- createCheckoutSession - Generate Stripe URL
- verifyStripeSession - Verify payment
- handleStripeWebhook - Process events

Voice/AI:
- transcribeAudioSimple - Main transcription
- voiceConversation - Two-way chat
- (Legacy: transcribeAudio, transcribeAudioAdvanced, voiceConversationAdvanced)

Utility:
- stripeHelper - Initialize Stripe client

---

## 🛠️ TECHNICAL STACK

Frontend:
- React 18.2 + React Router v6
- TanStack Query (state)
- shadcn/ui + Tailwind
- Lucide React (icons)
- Framer Motion (animations)

Backend:
- Deno Deploy
- Base44 (PostgreSQL + RLS)
- @base44/sdk@0.8.4

External Services:
- AssemblyAI (STT)
- OpenAI (GPT + Whisper)
- ElevenLabs (TTS)
- Stripe (Payments)

Environment Variables:
ASSEMBLY_AI_KEY=xxx
OPENAI_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
STRIPE_SECRET_KEY=xxx
STRIPE_PUBLISHABLE_KEY=xxx

---

## 🚨 CRITICAL ISSUES STATUS

1. Voice on iPhone - ✅ FIXED (Dec 27)
2. Public Invoice 500 - ✅ FIXED (Dec 27)
3. Stripe Keys Visible - ✅ FIXED (Dec 27)

---

## 🚀 LAUNCH CHECKLIST (MONDAY)

Critical:
[ ] Verify API keys in production
[ ] Test voice on iPhone Safari
[ ] Test Stripe payment end-to-end
[ ] Verify public invoice links
[ ] Test 3-5 real invoices
[ ] Mobile responsive (iOS + Android)
[ ] User-friendly error messages
[ ] Logo/branding finalized

---

## 🎯 VOICE DEBUG CHECKLIST

If voice still not working:

1. Check API Keys:
   - Dashboard → Settings → Secrets
   - ASSEMBLY_AI_KEY present?
   - OPENAI_API_KEY present?

2. Test Backend Function:
   - Dashboard → Code → Functions
   - Click transcribeAudioSimple
   - Check logs for errors

3. Test Browser Recording:
   - Open CreateInvoice page
   - Open browser console (F12)
   - Run: navigator.mediaDevices.getUserMedia({audio:true})
   - Should request permission

4. Test API Direct:
   - Use curl commands above
   - Verify keys work outside app

5. Check Network:
   - Browser → Network tab
   - Record voice
   - Look for POST to transcribeAudioSimple
   - Check status code (200 = success)

6. Verify Audio Format:
   - In backend logs: "🎵 Received: recording.XXX"
   - Should be .mp4, .webm, or .m4a
   - Size should be > 100 bytes

---

## 📞 FINAL NOTES

Voice is the HERO feature. Everything else works great.

If voice still broken after all fixes:
- Test on multiple devices (iPhone, Android, Desktop)
- Try different browsers (Safari, Chrome, Firefox)
- Check if mic works in other apps
- Verify network isn't blocking audio uploads

Success = User can speak naturally and get invoice in 30 seconds.

Good luck with Monday launch! 🚀

---

END OF SCHEMA
`;

// Export for reference
export default FRINVOICE_SCHEMA;