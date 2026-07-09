import { motion } from "framer-motion";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [liveTranscript, setLiveTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const pushTranscript = (text) => {
    setLiveTranscript(text);
    onTranscriptChange(text);
  };

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
      if (final) pushTranscript(final);
      else if (interim) pushTranscript(interim);
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
        pushTranscript(response.data.transcript);
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
                  pushTranscript("");
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
      pushTranscript("");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    pushTranscript("");
  };

  if (!micSupported) {
    return (
      <div className="rounded-md border-2 border-stamp bg-stamp/10 p-4 text-sm font-mono text-ink">
        Voice recording is not supported in this browser. Please try using Chrome, Firefox, or Safari.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Permission request — paper yellow banner */}
      {micPermission !== "granted" && (
        <div className="w-full rounded-md border-2 border-ink bg-[#f5e6a8] p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-ink flex-shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <p className="font-mono font-bold text-sm uppercase tracking-wider text-ink">Microphone Permission Required</p>
              <p className="text-xs font-mono text-ink/70">Enable voice recording to speak your invoice:</p>
              <Button
                onClick={requestMicrophonePermission}
                disabled={isCheckingPermission}
                className="w-full"
              >
                {isCheckingPermission ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                Request Microphone Access
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Circular mic button — 120px, ink → signal orange with expanding pulse */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        {/* Expanding pulse ring while recording */}
        {isRecording && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-signal"
              animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-signal"
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isTranscribing}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          style={{ width: 120, height: 120 }}
          className={`relative rounded-full flex items-center justify-center shadow-hard border-2 border-ink transition-colors duration-200 ${
            isRecording ? "bg-signal" : "bg-ink"
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-11 h-11 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-11 h-11 text-white" />
          ) : (
            <Mic className="w-11 h-11 text-white" />
          )}
        </motion.button>
      </div>

      {/* Status text — mono */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="font-mono font-semibold text-sm text-ink">{usingBrowserSTT ? "Processing…" : "AI processing…"}</p>
        ) : isRecording ? (
          <p className="font-mono font-semibold text-sm text-signal animate-pulse">LISTENING…</p>
        ) : (
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
            Tap &amp; talk — say it like you'd tell a friend
          </p>
        )}
      </div>

      {/* Live transcript — dashed paper note with blinking green cursor */}
      {(liveTranscript || isRecording || isTranscribing) && (
        <div className="w-full rounded-md border-2 border-dashed border-ink bg-paper p-4">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-ink/50 mb-2">Transcript</p>
          <p className="font-mono text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {liveTranscript || <span className="text-ink/40">…</span>}
            {(isRecording || isTranscribing) && (
              <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-money animate-pulse" />
            )}
          </p>
        </div>
      )}

      {/* Browser STT fallback */}
      {!isRecording && !isProcessing && micPermission === "granted" && (
        <Button
          variant="outline"
          size="sm"
          onClick={startBrowserSTT}
          className="text-xs"
        >
          <Mic className="w-4 h-4 mr-2" />
          Try Device Voice (Works Offline)
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="w-full rounded-md border-2 border-stamp bg-stamp/10 p-4 text-sm font-mono text-ink">
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
        </div>
      )}
    </div>
  );
}