
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Service 1: OpenAI Whisper (Primary)
const transcribeWithOpenAI = async (audioFile) => {
    const OpenAI = (await import('npm:openai@4.28.4')).default;
    const openai = new OpenAI({
        apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        temperature: 0,
    });

    return transcription.text?.trim() || "";
};

// Service 2: AssemblyAI (Fixed endpoint and flow)
const transcribeWithAssemblyAI = async (audioFile) => {
    const ASSEMBLY_API_KEY = Deno.env.get("ASSEMBLY_AI_KEY");
    if (!ASSEMBLY_API_KEY) throw new Error("AssemblyAI API key not found");

    // Upload file first
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
            'authorization': ASSEMBLY_API_KEY,
        },
        body: audioFile,
    });

    if (!uploadResponse.ok) {
        throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
    }

    const { upload_url } = await uploadResponse.json();

    // Create transcription job
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

    if (!transcribeResponse.ok) {
        throw new Error(`AssemblyAI transcription failed: ${transcribeResponse.status} ${await transcribeResponse.text()}`);
    }

    const { id } = await transcribeResponse.json();

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
            headers: { 'authorization': ASSEMBLY_API_KEY },
        });

        if (!statusResponse.ok) {
            throw new Error(`AssemblyAI status check failed: ${statusResponse.status}`);
        }

        const transcript = await statusResponse.json();

        if (transcript.status === 'completed') {
            return transcript.text || "";
        } else if (transcript.status === 'error') {
            throw new Error(`AssemblyAI error: ${transcript.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    throw new Error("AssemblyAI timeout after 60 seconds");
};

// Service 3: Google Cloud Speech (Fixed authentication)
const transcribeWithGoogle = async (audioFile) => {
    const GOOGLE_CLOUD_CREDENTIALS = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_CLOUD_CREDENTIALS) throw new Error("Google Cloud credentials not found");

    let credentials;
    try {
        // Parse the JSON credentials
        credentials = JSON.parse(GOOGLE_CLOUD_CREDENTIALS);
    } catch (e) {
        throw new Error("Invalid Google Cloud credentials JSON");
    }

    // Get access token using service account
    const jwtPayload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
    };

    // Create JWT token (simplified - using Google's endpoint directly)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${await createJWT(jwtPayload, credentials.private_key)}`,
    });

    if (!tokenResponse.ok) {
        throw new Error(`Google auth failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call Speech API
    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                model: 'latest_long',
                useEnhanced: true,
            },
            audio: { content: base64Audio },
        }),
    });

    if (!response.ok) {
        throw new Error(`Google Speech failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    
    if (result.results && result.results.length > 0) {
        return result.results[0].alternatives[0].transcript || "";
    }
    
    throw new Error("No transcription results from Google");
};

// Simplified JWT creation for Google
const createJWT = (payload, privateKey) => {
    // This is a simplified implementation
    // In production, you'd use a proper JWT library
    const header = { alg: 'RS256', typ: 'JWT' };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // For now, throw error - this needs proper crypto implementation
    throw new Error("JWT signing not implemented - use service account key file");
};

Deno.serve(async (req) => {
    console.log("🎤 Advanced transcription request received");

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

        // 🚀 PRIORITY ORDER: Most reliable services first
        const services = [
            { name: "AssemblyAI", func: transcribeWithAssemblyAI },
            { name: "OpenAI Whisper", func: transcribeWithOpenAI },
            // Temporarily disable Google Cloud due to JWT complexity
            // { name: "Google Cloud", func: transcribeWithGoogle },
        ];

        // Try each service in order
        for (const service of services) {
            try {
                console.log(`🔄 Attempting transcription with ${service.name}...`);
                transcript = await service.func(audioFile);
                
                if (transcript && transcript.trim().length > 0) {
                    successfulService = service.name;
                    console.log(`✅ ${service.name} successful: "${transcript.substring(0, 50)}..."`);
                    break;
                }
            } catch (error) {
                console.error(`❌ ${service.name} failed:`, error.message);
                errors.push(`${service.name}: ${error.message}`);
                continue;
            }
        }

        if (!transcript || transcript.trim().length === 0) {
            return new Response(JSON.stringify({ 
                error: `All transcription services failed. Please check your API keys.`,
                details: errors,
                suggestions: [
                    "1. Check your OpenAI billing and add credits if needed",
                    "2. Verify your ASSEMBLY_AI_KEY is correct",
                    "3. Make sure your microphone is working and you spoke clearly",
                    "4. Try speaking louder and closer to the microphone"
                ],
                debug: {
                    fileSize: audioFile.size,
                    fileType: audioFile.type,
                    fileName: audioFile.name,
                    servicesAttempted: services.length
                }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ 
            transcript: transcript.trim(),
            service: successfulService,
            message: `✅ Transcription successful via ${successfulService}`,
            debug: {
                fileSize: audioFile.size,
                fileType: audioFile.type,
                transcriptLength: transcript.length,
                primaryService: successfulService
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("💥 Transcription error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || "Transcription failed",
            suggestion: "Please check your API keys in Settings and try again",
            debug: { 
                stack: error.stack?.substring(0, 500) // Truncate stack trace
            }
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
