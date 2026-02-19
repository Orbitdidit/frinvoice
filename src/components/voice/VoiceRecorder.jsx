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
  const [micPermission, setMicPermission] = useState('unknown');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
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

  const requestMicrophonePermission = async () => {
    setIsCheckingPermission(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (error) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError') {
        setMicPermission('denied');
        setError("🎤 Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        setMicPermission('denied');
        setError("🎤 No microphone found. Please connect a microphone and try again.");
      } else {
        setMicPermission('denied');
        setError(`Permission failed: ${error.message}`);
      }
    } finally {
      setIsCheckingPermission(false);
    }
  };

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
    <div className="flex flex-col items-center space-y-3 md:space-y-4 p-4">
      {/* Microphone Permission Request - Mobile Optimized */}
      {micPermission !== 'granted' && (
        <Alert className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-300 dark:border-orange-700">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-orange-900 dark:text-orange-200">⚠️ Microphone Permission Required</p>
              <p className="text-sm text-orange-800 dark:text-orange-300">Click the button below to enable voice recording:</p>
              <Button 
                onClick={requestMicrophonePermission}
                disabled={isCheckingPermission}
                className="bg-orange-600 hover:bg-orange-700 text-white w-full"
              >
                {isCheckingPermission ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                Request Microphone Access
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Voice Recording Button */}
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: isRecording ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
        className="w-full flex justify-center"
      >
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isTranscribing}
          className={`w-24 h-24 md:w-28 md:h-28 rounded-full transition-all duration-300 shadow-xl ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-10 h-10 md:w-12 md:h-12 text-white" />
          ) : (
            <Mic className="w-10 h-10 md:w-12 md:h-12 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Status Text */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="text-purple-700 dark:text-purple-400 font-medium text-sm md:text-base">
            {usingBrowserSTT ? "🆓 Processing..." : "🤖 AI processing..."}
          </p>
        ) : isRecording ? (
          <p className="text-red-600 dark:text-red-400 font-medium animate-pulse text-sm md:text-base">
            🎤 {usingBrowserSTT ? "Listening..." : "Recording... Speak now!"}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm md:text-base">Tap to start recording</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Speak clearly for best results</p>
          </div>
        )}
      </div>
      
      {/* Mobile/Browser Native Fallback Button - Prominent */}
      {!isRecording && !isProcessing && micPermission === 'granted' && (
        <Button 
            variant="outline" 
            size="lg"
            onClick={startBrowserSTT}
            className="text-sm bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 w-full max-w-sm"
        >
          <Mic className="w-4 h-4 mr-2" />
          Try Device Voice (Works Offline)
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2 text-sm">
            {typeof error === 'string' ? (
              <div className="flex flex-col gap-2">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}