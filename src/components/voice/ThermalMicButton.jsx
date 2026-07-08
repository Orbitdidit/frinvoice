import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useRef, useCallback } from "react";
import { transcribeAudioSimple } from "@/functions/transcribeAudioSimple";

/**
 * Thermal-style circular mic button with live transcript below.
 * Props mirror the original VoiceRecorder so it's a drop-in UI replacement.
 */
export default function ThermalMicButton({ onTranscriptChange, onRecordingChange, isProcessing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [usingBrowserSTT, setUsingBrowserSTT] = useState(false);
  const [micPermission, setMicPermission] = useState("unknown");
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
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setMicPermission("denied");
        setError("🎤 Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setMicPermission("denied");
        setError("🎤 No microphone found. Please connect a microphone and try again.");
      } else {
        setMicPermission("denied");
        setError(`Permission failed: ${err.message}`);
      }
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const startBrowserSTT = async () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Browser speech recognition not supported. Please try typing instead.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setUsingBrowserSTT(true);
      onRecordingChange(true);
      setError(null);
    };
    recognitionRef.current.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) onTranscriptChange(final);
      else if (interim) onTranscriptChange(interim);
    };
    recognitionRef.current.onerror = (e) => {
      setError(`Speech recognition error: ${e.error}. Try speaking again or use typing.`);
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
    if (!checkMicrophoneSupport()) return;
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const getMimeType = () => {
        const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/ogg", ""];
        for (const type of types) {
          if (type === "" || MediaRecorder.isTypeSupported(type)) return type;
        }
        return "";
      };
      const mimeType = getMimeType();
      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      onRecordingChange(true);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("🎤 Microphone access denied. Please allow microphone permissions and try again.");
      } else if (err.name === "NotFoundError") {
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
      let ext = "webm";
      if (audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a")) ext = "mp4";
      else if (audioBlob.type.includes("ogg")) ext = "ogg";
      else if (audioBlob.type.includes("wav")) ext = "wav";
      formData.append("audio", audioBlob, `recording.${ext}`);
      const response = await transcribeAudioSimple(formData);
      if (response.data.transcript) {
        onTranscriptChange(response.data.transcript);
      } else {
        throw new Error(response.data.error || "No transcript received");
      }
    } catch (err) {
      if (err.response?.data?.fallbackOptions?.useBrowserSTT) {
        setError(
          <div className="space-y-2">
            <p className="font-semibold text-red-800">⚠️ AI Transcription Failed</p>
            <p className="text-sm">Your API keys aren't working. Try these options:</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button size="sm" onClick={startBrowserSTT} className="bg-blue-600 hover:bg-blue-700 text-white">
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
        if (err.response?.data?.error) detailedError = err.response.data.error;
        else if (err.message) detailedError = `Failed to connect to server: ${err.message}`;
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
    <div className="flex flex-col items-center space-y-6">
      {/* Permission request */}
      {micPermission !== "granted" && (
        <Alert className="bg-orange-50 border-orange-300">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-orange-900">⚠️ Microphone Permission Required</p>
              <p className="text-sm text-orange-800">Click the button below to enable voice recording:</p>
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

      {/* Circular mic button */}
      <div className="relative">
        {/* Pulsing ring while recording */}
        {isRecording && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-500"
              animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isTranscribing}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center shadow-[4px_4px_0_#17150f] border-2 border-[#17150f] transition-colors duration-200 ${
            isRecording ? "bg-red-600" : "bg-[#17150f]"
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-10 h-10 md:w-12 md:h-12 text-white" />
          ) : (
            <Mic className="w-10 h-10 md:w-12 md:h-12 text-white" />
          )}
        </motion.button>
      </div>

      {/* Status text */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="text-slate-700 font-semibold text-sm">{usingBrowserSTT ? "🆓 Processing..." : "🤖 AI processing..."}</p>
        ) : isRecording ? (
          <p className="text-red-600 font-semibold animate-pulse text-sm">🎤 {usingBrowserSTT ? "Listening..." : "Recording... Speak now!"}</p>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-600 font-semibold text-sm">Tap to start recording</p>
            <p className="text-xs text-slate-400">Speak clearly for best results</p>
          </div>
        )}
      </div>

      {/* Browser STT fallback */}
      {!isRecording && !isProcessing && micPermission === "granted" && (
        <Button
          variant="outline"
          size="sm"
          onClick={startBrowserSTT}
          className="text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
        >
          <Mic className="w-4 h-4 mr-2" />
          Try Device Voice (Works Offline)
        </Button>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2 text-sm">
            {typeof error === "string" ? (
              <div className="flex flex-col gap-2">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={handleRetry} className="w-full">
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