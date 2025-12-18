import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// BULLETPROOF FETCH IMPLEMENTATION for iPhone/Safari compatibility
Deno.serve(async (req) => {
    // 1. CORS Headers - Critical for mobile browsers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log("🎤 Voice Request Started");
        
        // 2. Auth Check with safe error handling
        const base44 = createClientFromRequest(req);
        try {
            await base44.auth.me();
        } catch (e) {
            console.error("Auth failed:", e);
            return new Response(JSON.stringify({ error: 'Authentication failed. Please log in.' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        // 3. Parse Form Data with checks
        let formData;
        try {
            formData = await req.formData();
        } catch (e) {
            console.error("FormData parse failed:", e);
            return new Response(JSON.stringify({ error: 'Failed to upload audio. Network issue?' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        const audioFile = formData.get('audio');
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio data received' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        console.log(`🎵 Received: ${audioFile.name} (${audioFile.type}), Size: ${audioFile.size}`);
        
        if (audioFile.size < 100) {
            return new Response(JSON.stringify({ error: 'Audio file is empty or too short' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }

        let transcript = "";
        let successfulService = "";
        const errors = [];

        // 4. Try AssemblyAI (Free Tier)
        const ASSEMBLY_API_KEY = Deno.env.get("ASSEMBLY_AI_KEY");
        if (ASSEMBLY_API_KEY) {
            try {
                console.log("🔄 Attempting AssemblyAI...");
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
                        // Poll with timeout
                        let retries = 0;
                        while (retries < 40) { // 40 seconds max
                            await new Promise(r => setTimeout(r, 1000));
                            const check = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
                                headers: { 'authorization': ASSEMBLY_API_KEY }
                            });
                            if (!check.ok) break;
                            const res = await check.json();
                            if (res.status === 'completed') {
                                transcript = res.text;
                                successfulService = "AssemblyAI";
                                console.log("✅ AssemblyAI Success");
                                break;
                            }
                            if (res.status === 'error') throw new Error(res.error);
                            retries++;
                        }
                    }
                } else {
                    console.error("AssemblyAI Upload Failed:", await uploadResp.text());
                }
            } catch (e) {
                console.error("AssemblyAI Error:", e);
                errors.push(`AssemblyAI: ${e.message}`);
            }
        }

        // 5. Fallback to OpenAI Whisper (Robust)
        if (!transcript) {
            const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
            if (OPENAI_API_KEY) {
                try {
                    console.log("🔄 Attempting OpenAI Whisper...");
                    const openaiForm = new FormData();
                    // IMPORTANT: OpenAI requires a filename with extension
                    openaiForm.append('file', audioFile, audioFile.name || 'recording.mp4'); 
                    openaiForm.append('model', 'whisper-1');
                    
                    const openAIResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                        body: openaiForm
                    });

                    const data = await openAIResp.json();
                    if (!openAIResp.ok) {
                        console.error("OpenAI Error Response:", data);
                        throw new Error(data.error?.message || "OpenAI rejected the file");
                    }
                    
                    if (data.text) {
                        transcript = data.text;
                        successfulService = "OpenAI Whisper";
                        console.log("✅ OpenAI Whisper Success");
                    }
                } catch (e) {
                    console.error("OpenAI Error:", e);
                    errors.push(`OpenAI: ${e.message}`);
                }
            } else {
                errors.push("OpenAI API Key missing");
            }
        }

        if (!transcript) {
            // Provide a very specific error for the UI
            const errorMsg = errors.length > 0 ? errors.join(' | ') : "All services failed silently";
            return new Response(JSON.stringify({ 
                error: "Transcription failed. Please try again.",
                details: errorMsg,
                debug: { errors }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        return new Response(JSON.stringify({ 
            transcript, 
            service: successfulService 
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error) {
        console.error("💥 Critical Server Error:", error);
        return new Response(JSON.stringify({ 
            error: "Server connection failed",
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});