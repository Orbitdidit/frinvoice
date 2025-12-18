import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.4';

const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') || "EXAVITQu4vr4xnSDxMaL"; // Default if not set

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // 1. Authenticate the user
    const base44 = createClientFromRequest(req);
    
    try {
        await base44.auth.me();
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    // Check for required API Key
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY missing from server environment" }), { status: 500 });
    }
    if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing from server environment" }), { status: 500 });
    }

    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
    });

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        const conversationHistory = formData.get('conversation_history') || '';
        
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), { status: 400 });
        }

        // 2. Speech to Text (Whisper)
        const tr = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
        });
        const userText = (tr.text || "").trim();

        // 3. Generate Chat Response (GPT-4o mini)
        const systemPrompt = `You are Frinvoice, a concise, friendly voice invoicing assistant. Respond briefly and conversationally, and ask for one clarifying detail when appropriate.`;
        const chat = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Previous context: ${conversationHistory}\n\nUser's new message: ${userText}` }
            ],
            temperature: 0.6,
            max_tokens: 100,
        });
        const aiResponse = chat.choices?.[0]?.message?.content?.trim() || "Got it.";

        // 4. Text to Speech (ElevenLabs)
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
                text: aiResponse,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.4, similarity_boost: 0.75 }
            })
        });

        if (!ttsResponse.ok) {
            const errText = await ttsResponse.text();
            throw new Error(`TTS failed: ${ttsResponse.status} ${errText}`);
        }

        const audioArrayBuffer = await ttsResponse.arrayBuffer();

        // 5. Return audio bytes with custom headers
        return new Response(audioArrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "X-AI-Response": aiResponse,
                "X-User-Text": userText,
                "Access-Control-Expose-Headers": "X-AI-Response, X-User-Text", // Expose headers to the browser
                "Cache-Control": "no-store",
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message || "Voice conversation failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});