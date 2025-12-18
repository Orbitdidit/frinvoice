import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// NATIVE FETCH IMPLEMENTATION - No heavy libraries to cause 500 errors
Deno.serve(async (req) => {
    // CORS Headers
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
        
        // 1. Auth Check
        try {
            await base44.auth.me();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        // 2. Parse Form Data
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        console.log(`🎵 Audio file: ${audioFile.name}, size: ${audioFile.size}`);

        let transcript = "";
        let successfulService = "";
        const errors = [];

        // 3. Try AssemblyAI (Free Tier)
        const ASSEMBLY_API_KEY = Deno.env.get("ASSEMBLY_AI_KEY");
        if (ASSEMBLY_API_KEY) {
            try {
                console.log("🔄 Trying AssemblyAI...");
                const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
                    method: 'POST',
                    headers: { 'authorization': ASSEMBLY_API_KEY },
                    body: audioFile
                });

                if (uploadResp.ok) {
                    const { upload_url } = await uploadResp.json();
                    const txResp = await fetch('https://api.assemblyai.com/v2/transcripts', {
                        method: 'POST',
                        headers: { 'authorization': ASSEMBLY_API_KEY, 'content-type': 'application/json' },
                        body: JSON.stringify({ audio_url: upload_url, language_code: 'en_us' })
                    });

                    if (txResp.ok) {
                        const { id } = await txResp.json();
                        // Poll
                        for (let i = 0; i < 30; i++) {
                            await new Promise(r => setTimeout(r, 1000));
                            const check = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
                                headers: { 'authorization': ASSEMBLY_API_KEY }
                            });
                            const res = await check.json();
                            if (res.status === 'completed') {
                                transcript = res.text;
                                successfulService = "AssemblyAI";
                                break;
                            }
                            if (res.status === 'error') throw new Error(res.error);
                        }
                    }
                }
            } catch (e) {
                console.error("AssemblyAI error:", e);
                errors.push(`AssemblyAI: ${e.message}`);
            }
        }

        // 4. Fallback to OpenAI Whisper (using lightweight FETCH, no SDK)
        if (!transcript) {
            const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
            if (OPENAI_API_KEY) {
                try {
                    console.log("🔄 Trying OpenAI Whisper...");
                    const openaiForm = new FormData();
                    openaiForm.append('file', audioFile);
                    openaiForm.append('model', 'whisper-1');
                    
                    const openAIResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        },
                        body: openaiForm
                    });

                    const data = await openAIResp.json();
                    if (!openAIResp.ok) throw new Error(data.error?.message || "OpenAI error");
                    
                    if (data.text) {
                        transcript = data.text;
                        successfulService = "OpenAI Whisper";
                    }
                } catch (e) {
                    console.error("OpenAI error:", e);
                    errors.push(`OpenAI: ${e.message}`);
                }
            }
        }

        if (!transcript) {
            throw new Error(`All transcription services failed. Details: ${errors.join(', ')}`);
        }

        return new Response(JSON.stringify({ 
            transcript, 
            service: successfulService 
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error) {
        console.error("💥 Function error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || "Internal Server Error",
            details: error.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});