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
        // For voice dictation on public pages (if any), we might want to relax this.
        // But assuming this is only for logged in users in CreateInvoice.
        const base44 = createClientFromRequest(req);
        try {
            const user = await base44.auth.me();
             if (!user) {
                 // Double check if it returned null without throwing
                 throw new Error("User not found");
             }
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

        // Fix for iPhone/Safari blobs sometimes having weird names or types
        const safeName = audioFile.name || 'recording.m4a';
        // Safari usually records as audio/mp4 or audio/x-m4a, but sometimes type is empty
        const safeType = audioFile.type || 'audio/mp4';

        console.log(`🎵 Received: ${safeName} (${safeType}), Size: ${audioFile.size}`);
        
        if (audioFile.size < 100) {
            return new Response(JSON.stringify({ error: 'Audio file is empty or too short. Please speak longer.' }), { 
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
                    
                    // Normalize the file for OpenAI
                    // If the file comes from iPhone, it might be audio/mp4 but explicitly named 'recording' (no ext)
                    // We force an extension that OpenAI likes based on content or fallback
                    let fileName = audioFile.name || 'recording.mp4';
                    if (!fileName.includes('.')) {
                        fileName += '.mp4'; // Default to mp4 for safety
                    }
                    
                    // Create a new blob/file with the correct name/type if needed
                    // In Deno/Fetch, we pass the file object directly. 
                    // However, we can trick it by passing the filename as the 3rd argument to append if supported,
                    // or just relying on the file object having a name property.
                    // The safest way is to ensure the 3rd arg is provided.
                    openaiForm.append('file', audioFile, fileName); 
                    openaiForm.append('model', 'whisper-1');
                    
                    const openAIResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                        body: openaiForm
                    });

                    let data;
                    try {
                        data = await openAIResp.json();
                    } catch (jsonError) {
                         console.error("OpenAI JSON Parse Error:", jsonError);
                         throw new Error(`OpenAI API returned invalid JSON: ${openAIResp.statusText}`);
                    }
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