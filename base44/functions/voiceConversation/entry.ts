import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// NATIVE FETCH IMPLEMENTATION - No heavy libraries
Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);
        
        // Auth
        try {
            await base44.auth.me();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio');
        const conversationHistory = formData.get('conversation_history') || '';
        
        if (!audioFile) return new Response(JSON.stringify({ error: 'No audio' }), { status: 400, headers: corsHeaders });

        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
        const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') || "EXAVITQu4vr4xnSDxMaL";

        // 1. Transcribe (Whisper)
        const whisperForm = new FormData();
        whisperForm.append('file', audioFile);
        whisperForm.append('model', 'whisper-1');

        const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: whisperForm
        });
        const whisperData = await whisperResp.json();
        const userText = whisperData.text || "";

        // 2. Chat (GPT-4o)
        const chatResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are Frinvoice, a concise, friendly voice invoicing assistant." },
                    { role: "user", content: `Context: ${conversationHistory}\n\nMessage: ${userText}` }
                ],
                max_tokens: 150
            })
        });
        const chatData = await chatResp.json();
        const aiResponse = chatData.choices?.[0]?.message?.content || "I heard you.";

        // 3. TTS (ElevenLabs)
        const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: aiResponse,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!ttsResp.ok) throw new Error("TTS Failed");
        const audioBuffer = await ttsResp.arrayBuffer();

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "X-AI-Response": aiResponse,
                "X-User-Text": userText,
                "Access-Control-Expose-Headers": "X-AI-Response, X-User-Text",
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error("Voice error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});