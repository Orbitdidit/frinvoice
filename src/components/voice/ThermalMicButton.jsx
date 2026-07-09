import { motion } from "framer-motion";
import { Mic, MicOff, Loader2, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudioSimple } from "@/functions/transcribeAudioSimple";

/**
 * Thermal-style circular mic button.
 *
 * Records CONTINUOUSLY until the user taps stop. Collects ALL audio chunks,
 * sends the full blob to transcription, and only signals a finished transcript
 * via onTranscriptReady AFTER transcription completes (no early-stop race).
 *
 * Props:
 *  - onTranscriptReady(text, { append })  fired once transcription finishes
 *  - onRecordingChange(bool)
 *  - onDebug(partialDebugObject)          streams diagnostics to parent
 *  - isProcessing                          parent is busy parsing
 *  - appendMode                            "add more" style secondary button label
 */
export default function ThermalMicButton({
  onTranscriptReady,
  onRecordingChange,
  onDebug,
  isProcessing,
  appendMode = false,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [usingBrowserSTT, setUsingBrowserSTT] = useState(false);
  const [micPermission, setMicPermission] = useState("unknown");
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recognitionFinalRef = useRef(""); // accumulates ALL final browser-STT phrases
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const appendModeRef = useRef(appendMode);

  useEffect(() => {
    appendModeRef.current = appendMode;
  }, [appendMode]);

  const debug = useCallback(
    (patch) => {
      if (onDebug) onDebug(patch);
    },
    [onDebug]
  );

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 100);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    return (Date.now() - startTimeRef.current) / 1000;
  };

  useEffect(() => () => stopTimer(), []);

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

  // ---------- Browser-native STT (continuous, accumulates ALL finals) ----------
  const startBrowserSTT = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Browser speech recognition not supported. Please try typing instead.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";
    recognitionFinalRef.current = "";

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setUsingBrowserSTT(true);
      onRecordingChange(true);
      setError(null);
      setLiveTranscript("");
      startTimer();
      debug({ service: "Browser STT", blobSize: 0, duration: 0, rawTranscript: "" });
    };

    recognitionRef.current.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          recognitionFinalRef.current += (recognitionFinalRef.current ? " " : "") + t.trim();
        } else {
          interim += t;
        }
      }
      const combined = (recognitionFinalRef.current + " " + interim).trim();
      setLiveTranscript(combined);
      debug({ rawTranscript: combined });
    };

    recognitionRef.current.onerror = (e) => {
      // "no-speech" / "aborted" shouldn't nuke what we already captured
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Speech recognition error: ${e.error}. Try speaking again or use typing.`);
      }
    };

    recognitionRef.current.onend = () => {
      const dur = stopTimer();
      setIsRecording(false);
      onRecordingChange(false);
      setUsingBrowserSTT(false);
      const finalText = recognitionFinalRef.current.trim();
      debug({ duration: Number(dur.toFixed(1)), rawTranscript: finalText, service: "Browser STT" });
      if (finalText) {
        onTranscriptReady(finalText, { append: appendModeRef.current });
      }
    };

    recognitionRef.current.start();
  };

  // ---------- Server transcription (MediaRecorder → Whisper/AssemblyAI) ----------
  const startRecording = async () => {
    if (!checkMicrophoneSupport()) return;
    setError(null);
    audioChunksRef.current = [];
    setLiveTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
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
        // Collect EVERY chunk — never stop on the first one.
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const dur = stopTimer();
        // Assemble ALL chunks into one blob.
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        debug({ duration: Number(dur.toFixed(1)), blobSize: audioBlob.size, service: "…", rawTranscript: "" });
        await transcribeAudio(audioBlob, dur);
      };

      // timeslice 1000ms — fires ondataavailable every second so long recordings
      // stream chunks; the recorder keeps running until we explicitly call .stop().
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      onRecordingChange(true);
      startTimer();
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
      // request a final chunk flush, then stop
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        /* not all browsers support requestData; onstop still flushes */
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    onRecordingChange(false);
  };

  const transcribeAudio = async (audioBlob, dur) => {
    setIsTranscribing(true);
    setError(null);
    try {
      if (audioBlob.size < 100) {
        throw new Error("Audio came through empty — please tap the mic and speak a little longer.");
      }
      const formData = new FormData();
      let ext = "webm";
      if (audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a")) ext = "mp4";
      else if (audioBlob.type.includes("ogg")) ext = "ogg";
      else if (audioBlob.type.includes("wav")) ext = "wav";
      formData.append("audio", audioBlob, `recording.${ext}`);

      console.log(`🎤 Sending audio: ${audioBlob.size} bytes, ${dur.toFixed(1)}s, type=${audioBlob.type}`);
      const response = await transcribeAudioSimple(formData);
      const transcript = response?.data?.transcript;
      const service = response?.data?.service || "server";

      debug({ service, rawTranscript: transcript || "", blobSize: audioBlob.size });
      console.log(`✅ Transcript (${service}), ${(transcript || "").length} chars:`, transcript);

      if (transcript && transcript.trim()) {
        setLiveTranscript(transcript);
        onTranscriptReady(transcript, { append: appendModeRef.current });
      } else {
        throw new Error(response?.data?.error || "No transcript received");
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
            </div>
          </div>
        );
      } else {
        let detailedError = "Voice transcription failed. Please try again or type your request.";
        if (err.response?.data?.error) detailedError = err.response.data.error;
        else if (err.message) detailedError = err.message;
        setError(detailedError);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  if (!micSupported) {
    return (
      <div className="rounded-md border-2 border-stamp bg-stamp/10 p-4 text-sm font-mono text-ink">
        Voice recording is not supported in this browser. Please try using Chrome, Firefox, or Safari.
      </div>
    );
  }

  const MicButtonIcon = appendMode ? Plus : Mic;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Permission request */}
      {micPermission !== "granted" && (
        <div className="w-full rounded-md border-2 border-ink bg-[#f5e6a8] p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-ink flex-shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <p className="font-mono font-bold text-sm uppercase tracking-wider text-ink">Microphone Permission Required</p>
              <p className="text-xs font-mono text-ink/70">Enable voice recording to speak your invoice:</p>
              <Button onClick={requestMicrophonePermission} disabled={isCheckingPermission} className="w-full">
                {isCheckingPermission ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                Request Microphone Access
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Circular mic button */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
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
            <MicButtonIcon className="w-11 h-11 text-white" />
          )}
        </motion.button>
      </div>

      {/* Status text + live timer */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="font-mono font-semibold text-sm text-ink">{usingBrowserSTT ? "Processing…" : "AI processing…"}</p>
        ) : isRecording ? (
          <p className="font-mono font-semibold text-sm text-signal animate-pulse">
            LISTENING… {elapsed.toFixed(1)}s — tap to stop
          </p>
        ) : (
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
            {appendMode ? "Tap to add more — keep talking" : "Tap & talk — say it like you'd tell a friend"}
          </p>
        )}
      </div>

      {/* Live transcript */}
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
      {!isRecording && !isProcessing && !isTranscribing && micPermission === "granted" && (
        <Button variant="outline" size="sm" onClick={startBrowserSTT} className="text-xs">
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