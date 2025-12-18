import { useState, useRef, useCallback } from "react";
import { transcribeAudioSimple } from "@/functions/transcribeAudioSimple";
import { Mic, MicOff, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function VoiceRecorder({ onTranscriptChange, onRecordingChange, isProcessing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [usingBrowserSTT, setUsingBrowserSTT] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const checkMicrophoneSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicSupported(false);
      setError("Voice recording not supported in this browser. Please use Chrome, Firefox, or Safari.");
      return false;
    }
    return true;
  }, []);

  // 🆓 FREE Browser Speech Recognition Fallback
  const startBrowserSTT = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Browser speech recognition not supported. Please try typing instead.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setUsingBrowserSTT(true);
      onRecordingChange(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("🆓 Browser STT result:", transcript);
      onTranscriptChange(transcript);
      setIsRecording(false);
      onRecordingChange(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Browser STT error:", event.error);
      setError(`Speech recognition error: ${event.error}. Try speaking again or use typing.`);
      setIsRecording(false);
      onRecordingChange(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
      onRecordingChange(false);
      setUsingBrowserSTT(false);
    };

    recognitionRef.current.start();
  };

  const startRecording = async () => {
    // On iPhone/Mobile, prefer browser native STT if server failed previously or just as a better UX
    // But let's keep the main button for High Quality AI, and add the fallback button.
    
    if (!checkMicrophoneSupport()) return;
    
    setError(null);
    audioChunksRef.current = [];

    try {
      // Relaxed constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });

      // Better MIME type detection for Safari/Chrome compatibility
      const getMimeType = () => {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/ogg',
          ''
        ];
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
      };

      const mimeType = getMimeType();
      console.log("🎤 Using MIME type:", mimeType || "default");

      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      onRecordingChange(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError("🎤 Microphone access denied. Please allow microphone permissions and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("🎤 No microphone found. Please check your audio device.");
      } else {
        setError(`Recording failed: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (usingBrowserSTT && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    onRecordingChange(false);
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      // Determine extension based on blob type
      // Enhanced extension detection for iOS/Safari
      let ext = 'webm';
      if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) {
        ext = 'mp4';
      } else if (audioBlob.type.includes('ogg')) {
        ext = 'ogg';
      } else if (audioBlob.type.includes('wav')) {
        ext = 'wav';
      }
      // Safari often produces audio/mp4 but calls it something else or nothing
      // We'll trust the mime type check we did earlier
      formData.append('audio', audioBlob, `recording.${ext}`);

      console.log(`🎤 Sending audio (${audioBlob.type}) to transcription service...`);
      const response = await transcribeAudioSimple(formData);

      if (response.data.transcript) {
        onTranscriptChange(response.data.transcript);
        console.log("✅ Transcription successful:", response.data.transcript);
      } else {
        throw new Error(response.data.error || "No transcript received");
      }

    } catch (err) {
      console.error("Transcription error:", err);

      // If server transcription fails, offer browser STT as backup
      if (err.response?.data?.fallbackOptions?.useBrowserSTT) {
        setError(
          <div className="space-y-2">
            <p className="font-semibold text-red-800">⚠️ AI Transcription Failed</p>
            <p className="text-sm">Your API keys aren't working. Try these options:</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={startBrowserSTT}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                🆓 Try Browser Voice (Free)
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setError(null);
                  onTranscriptChange("");
                }}
              >
                💻 Use Typing Instead
              </Button>
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t mt-2">
              To fix AI, check your API keys and billing in your app settings.
            </p>
          </div>
        );
      } else {
        let detailedError = "Voice transcription failed. Please try again or type your request.";
        if (err.response?.data?.error) {
          detailedError = err.response.data.error;
        } else if (err.message) {
          detailedError = `Failed to connect to server: ${err.message}`;
        }
        setError(detailedError);
      }
      
      onTranscriptChange("");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    onTranscriptChange("");
  };

  if (!micSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Voice recording is not supported in this browser. Please try using Chrome, Firefox, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Voice Recording Button */}
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: isRecording ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isTranscribing}
          className={`w-20 h-20 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Status Text */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="text-purple-700 font-medium">
            {usingBrowserSTT ? "🆓 Browser processing..." : "🤖 AI processing your voice..."}
          </p>
        ) : isRecording ? (
          <p className="text-red-600 font-medium animate-pulse">
            🎤 {usingBrowserSTT ? "Browser listening..." : "Recording... Speak now!"}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-600 font-medium">Tap to start recording</p>
            <p className="text-xs text-slate-400">or use your keyboard's microphone 🎤</p>
          </div>
        )}
      </div>
      
      {/* Mobile/Browser Native Fallback Button - Always visible on mobile/touch if not recording */}
      {!isRecording && !isProcessing && (
        <div className="md:hidden pt-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={startBrowserSTT}
                className="text-xs bg-slate-50 border-slate-200 text-slate-600"
            >
                Start Device Dictation (Offline)
            </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            {typeof error === 'string' ? (
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <div className="text-center text-sm text-slate-500 max-w-md">
        <p className="mb-2">💡 <strong>Multiple Options Available:</strong></p>
        <ul className="text-xs space-y-1">
          <li>• 🆓 <strong>Browser Voice:</strong> Free, works offline (Chrome/Safari)</li>
          <li>• 🤖 <strong>AI Transcription:</strong> Higher accuracy (requires API setup)</li>
          <li>• 💻 <strong>Manual Typing:</strong> Always available as backup</li>
          <li>• AssemblyAI gives you 5 hours FREE per month!</li>
        </ul>
      </div>
    </div>
  );
}