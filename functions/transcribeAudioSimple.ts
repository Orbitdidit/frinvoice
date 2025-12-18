import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.4';

Deno.serve(async (req) => {
    console.log("🎤 Simple transcription request received");

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

    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        console.log(`🎵 Audio file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

        if (audioFile.size > 25 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'Audio file too large (max 25MB)' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        let transcript = "";
        let successfulService = "";
        const errors = [];

        // 🆓 SERVICE 1: AssemblyAI (5 hours FREE per month)
        const ASSEMBLY_API_KEY = Deno.env.get("ASSEMBLY_AI_KEY");
        if (ASSEMBLY_API_KEY) {
            try {
                console.log("🔄 Trying AssemblyAI (FREE TIER)...");
                
                // Upload file
                const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
                    method: 'POST',
                    headers: {
                        'authorization': ASSEMBLY_API_KEY,
                    },
                    body: audioFile,
                });

                if (uploadResponse.ok) {
                    const { upload_url } = await uploadResponse.json();
                    
                    // Start transcription
                    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcripts', {
                        method: 'POST',
                        headers: {
                            'authorization': ASSEMBLY_API_KEY,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            audio_url: upload_url,
                            language_code: 'en_us',
                        }),
                    });

                    if (transcribeResponse.ok) {
                        const { id } = await transcribeResponse.json();
                        
                        // Poll for completion (max 30 seconds for better UX)
                        for (let i = 0; i < 30; i++) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
                                headers: { 'authorization': ASSEMBLY_API_KEY },
                            });

                            if (statusResponse.ok) {
                                const result = await statusResponse.json();
                                
                                if (result.status === 'completed' && result.text) {
                                    transcript = result.text.trim();
                                    successfulService = "🆓 AssemblyAI (FREE)";
                                    console.log("✅ AssemblyAI FREE success!");
                                    break;
                                } else if (result.status === 'error') {
                                    throw new Error(`AssemblyAI processing error: ${result.error}`);
                                }
                            }
                        }
                        
                        if (!transcript) {
                            throw new Error("AssemblyAI timeout after 30 seconds");
                        }
                    }
                } else {
                    const errorText = await uploadResponse.text();
                    throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} - ${errorText}`);
                }
            } catch (error) {
                console.log(`❌ AssemblyAI failed: ${error.message}`);
                errors.push(`AssemblyAI: ${error.message}`);
            }
        } else {
            console.log("⚠️ No AssemblyAI key found, skipping...");
            errors.push("AssemblyAI: API key not configured");
        }

        // 🤖 SERVICE 2: OpenAI Whisper (PAID - Only if AssemblyAI fails)
        if (!transcript) {
            const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
            if (OPENAI_API_KEY) {
                try {
                    console.log("🔄 Trying OpenAI Whisper (PAID)...");
                    
                    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

                    const transcription = await openai.audio.transcriptions.create({
                        file: audioFile,
                        model: "whisper-1",
                        language: "en",
                        response_format: "json",
                        temperature: 0,
                    });

                    if (transcription.text && transcription.text.trim()) {
                        transcript = transcription.text.trim();
                        successfulService = "OpenAI Whisper (PAID)";
                        console.log("✅ OpenAI Whisper success!");
                    }
                } catch (error) {
                    console.log(`❌ OpenAI Whisper failed: ${error.message}`);
                    errors.push(`OpenAI Whisper: ${error.message}`);
                    
                    // Check if it's a quota/billing issue
                    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exceeded')) {
                        errors.push("🔥 URGENT: Your OpenAI account has hit its usage limit. Please add credits at https://platform.openai.com/account/billing");
                    }
                }
            } else {
                console.log("⚠️ No OpenAI key found, skipping...");
                errors.push("OpenAI: API key not configured");
            }
        }

        // 🚫 If all services failed, return helpful error
        if (!transcript) {
            return new Response(JSON.stringify({ 
                error: `All available transcription services failed. Please check your API keys and billing.`,
                details: errors,
                suggestions: [
                    "🆓 Try the FREE browser voice option by clicking the blue button",
                    "🔑 Check your ASSEMBLY_AI_KEY is correct (gives you 5 FREE hours/month)",  
                    "💰 If you need premium quality: Add credits at https://platform.openai.com/account/billing",
                    "💻 Alternative: Use typing instead of voice"
                ],
                fallbackOptions: {
                    useTyping: true,
                    useBrowserSTT: true,
                    message: "Voice transcription is temporarily unavailable. Please try the browser voice option or type your request."
                },
                debug: {
                    fileSize: audioFile.size,
                    fileType: audioFile.type,
                    servicesAttempted: errors.length,
                    availableKeys: {
                        openai: !!Deno.env.get("OPENAI_API_KEY"),
                        assemblyai: !!Deno.env.get("ASSEMBLY_AI_KEY")
                    }
                }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ 
            transcript: transcript,
            service: successfulService,
            message: `✅ Transcription successful via ${successfulService}`,
            usage: successfulService.includes('FREE') ? 'FREE_TIER' : 'PAID_TIER',
            debug: {
                fileSize: audioFile.size,
                fileType: audioFile.type,
                transcriptLength: transcript.length,
                primaryService: successfulService,
                fallbacksAttempted: errors.length
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("💥 Transcription error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || "Transcription failed",
            suggestion: "Please try the FREE browser voice option or type your request instead.",
            fallbackOptions: {
                useBrowserSTT: true,
                useTyping: true
            },
            debug: { 
                stack: error.stack?.substring(0, 500),
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});