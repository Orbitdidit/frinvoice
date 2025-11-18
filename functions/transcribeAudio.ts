import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'), 
});

// Try multiple transcription services for better reliability
const transcribeWithOpenAI = async (audioFile) => {
    const OpenAI = (await import('npm:openai')).default;
    const openai = new OpenAI({
        apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // Specify language for better accuracy
        response_format: "json",
        temperature: 0, // More deterministic
    });

    return transcription.text?.trim() || "";
};

const transcribeWithAssemblyAI = async (audioFile) => {
    const ASSEMBLY_API_KEY = Deno.env.get("ASSEMBLY_AI_KEY");
    if (!ASSEMBLY_API_KEY) throw new Error("AssemblyAI API key not found");

    // First, upload the file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
            'authorization': ASSEMBLY_API_KEY,
            'content-type': 'application/octet-stream',
        },
        body: audioFile,
    });

    if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const { upload_url } = await uploadResponse.json();

    // Then, transcribe
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
        throw new Error(`Transcription failed: ${transcribeResponse.status}`);
    }

    const { id } = await transcribeResponse.json();

    // Poll for completion
    let transcript;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcripts/${id}`, {
            headers: { 'authorization': ASSEMBLY_API_KEY },
        });

        transcript = await statusResponse.json();

        if (transcript.status === 'completed') {
            return transcript.text || "";
        } else if (transcript.status === 'error') {
            throw new Error(`Transcription error: ${transcript.error}`);
        }

        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    throw new Error("Transcription timeout");
};

Deno.serve(async (req) => {
    console.log("Transcription request received");

    // 1. Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    
    try {
        await base44.auth.me();
        console.log("User authenticated successfully");
    } catch (e) {
        console.error("Authentication failed:", e);
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    try {
        // 2. Get audio file from multipart form data
        const formData = await req.formData();
        const audioFile = formData.get('audio');
        
        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        console.log(`Audio file received: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

        // Validate file size (10MB max)
        if (audioFile.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'Audio file too large (max 10MB)' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        let transcript = "";
        let transcriptionError = "";

        // 3. Try OpenAI Whisper first (primary)
        try {
            console.log("Attempting transcription with OpenAI Whisper...");
            transcript = await transcribeWithOpenAI(audioFile);
            console.log(`OpenAI transcription successful: ${transcript.length} characters`);
        } catch (openAIError) {
            console.error("OpenAI Whisper failed:", openAIError.message);
            transcriptionError = `OpenAI: ${openAIError.message}`;

            // 4. Fallback to AssemblyAI if OpenAI fails
            try {
                console.log("Attempting transcription with AssemblyAI...");
                transcript = await transcribeWithAssemblyAI(audioFile);
                console.log(`AssemblyAI transcription successful: ${transcript.length} characters`);
            } catch (assemblyError) {
                console.error("AssemblyAI failed:", assemblyError.message);
                transcriptionError += ` | AssemblyAI: ${assemblyError.message}`;
            }
        }

        if (!transcript) {
            return new Response(JSON.stringify({ 
                error: `All transcription services failed: ${transcriptionError}`,
                debug: {
                    fileSize: audioFile.size,
                    fileType: audioFile.type,
                    fileName: audioFile.name
                }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 5. Return the transcript
        return new Response(JSON.stringify({ 
            transcript,
            service: transcriptionError ? "AssemblyAI" : "OpenAI",
            debug: {
                fileSize: audioFile.size,
                fileType: audioFile.type,
                transcriptLength: transcript.length
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Transcription error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || "Transcription failed",
            debug: {
                stack: error.stack
            }
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});