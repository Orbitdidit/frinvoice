import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import OpenAI from 'npm:openai@4.28.4';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') || "EXAVITQu4vr4xnSDxMaL";

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// 🎯 MULTIPLE TTS OPTIONS - SPEED vs QUALITY
const generateSpeech = async (text, voiceQuality = 'fast') => {
    if (voiceQuality === 'premium' && ELEVENLABS_API_KEY) {
        // 🎭 PREMIUM: ElevenLabs (Best Quality)
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.8 } // Slightly more expressive
            })
        });

        if (!response.ok) throw new Error(`ElevenLabs TTS failed: ${response.status}`);
        return { audioBuffer: await response.arrayBuffer(), service: 'ElevenLabs' };
    } else {
        // ⚡ FAST: OpenAI TTS (Speed + Quality)
        const mp3 = await openai.audio.speech.create({
            model: "tts-1-hd",
            voice: "nova", // Natural, friendly female voice
            input: text,
            speed: 1.05 // Slightly faster for efficiency
        });

        return { audioBuffer: await mp3.arrayBuffer(), service: 'OpenAI TTS' };
    }
};

// 🚀 MULTIPLE STT OPTIONS - SPEED vs ACCURACY  
const transcribeAudio = async (audioFile, transcriptionQuality = 'fast') => {
    if (transcriptionQuality === 'premium' && DEEPGRAM_API_KEY) {
        // 🎯 PREMIUM: Deepgram (Lightning Fast)
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'audio/wav'
            },
            body: audioFile
        });

        if (!response.ok) throw new Error(`Deepgram failed: ${response.status}`);
        const result = await response.json();
        return { text: result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "", service: 'Deepgram' };
    } else {
        // ⚡ FAST: OpenAI Whisper (Reliable)
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
        });
        return { text: transcription.text?.trim() || "", service: 'OpenAI Whisper' };
    }
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
    }

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        const conversationHistory = formData.get('conversation_history') || '';
        const voiceQuality = formData.get('voice_quality') || 'fast';
        const transcriptionQuality = formData.get('transcription_quality') || 'fast';
        
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), { status: 400 });
        }

        // 🎤 STEP 1: Speech to Text
        const { text: userText, service: sttService } = await transcribeAudio(audioFile, transcriptionQuality);

        if (!userText) {
            return new Response(JSON.stringify({ error: 'No speech detected in audio' }), { status: 400 });
        }

        // 🧠 STEP 2: Generate AI Response with NEW CHEERFUL PERSONA
        const systemPrompt = `You are INVIO, the world's most cheerful and efficient voice invoicing assistant! 🎉

YOUR PERSONALITY:
- Cheerful, energetic, and highly professional
- Always use contractions (I'll, you're, we'll, that's, etc.) to sound natural
- Use conversational fillers: "Got it!", "Perfect!", "Awesome!", "Just a moment", "Let me help you with that"
- Keep responses SHORT (under 60 words) - you're speaking, not writing
- Be proactive and suggest next steps

YOUR CAPABILITIES:
- Create professional invoices through natural conversation
- Calculate pricing intelligently
- Remember context from previous messages
- Ask smart follow-up questions ONE at a time

SPEECH RHYTHM RULES:
- Add natural pauses: "Got it, let me help with that."
- Confirm before asking: "Perfect! Now, what's the client's name?"
- Use fillers for transitions: "Awesome! I'll get that set up for you."

EXAMPLE RESPONSES:
❌ BAD: "I understand you need an invoice. I will need some information from you. What is the client name?"
✅ GOOD: "Perfect! I'll help you create that invoice. What's your client's name?"

❌ BAD: "I have recorded the information. What is the next piece of information you would like to provide?"
✅ GOOD: "Got it! And what services did you provide?"

Keep it conversational, upbeat, and efficient!`;

        const chat = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Previous conversation: ${conversationHistory}\n\nUser just said: ${userText}` }
            ],
            temperature: 0.7, // Slightly higher for more personality
            max_tokens: 80, // Shorter responses for voice
        });

        const aiResponse = chat.choices?.[0]?.message?.content?.trim() || "Got it! Tell me more.";

        // 🗣️ STEP 3: Text to Speech
        const { audioBuffer, service: ttsService } = await generateSpeech(aiResponse, voiceQuality);

        // 🎉 RETURN ENHANCED RESPONSE
        return new Response(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "X-AI-Response": aiResponse,
                "X-User-Text": userText,
                "X-STT-Service": sttService,
                "X-TTS-Service": ttsService,
                "X-Voice-Quality": voiceQuality,
                "Access-Control-Expose-Headers": "X-AI-Response, X-User-Text, X-STT-Service, X-TTS-Service, X-Voice-Quality",
                "Cache-Control": "no-store",
            }
        });

    } catch (err) {
        console.error("Voice conversation error:", err);
        return new Response(JSON.stringify({ 
            error: err.message || "Voice conversation failed",
            debug: err.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});