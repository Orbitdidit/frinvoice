import { X } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Hidden diagnostics panel — toggled by tapping the INVOX THERMAL header 5x.
 * Shows recording duration, audio blob size, which STT service responded,
 * and the raw transcript, so production issues can be diagnosed live.
 */
export default function VoiceDebugPanel({ debug, onClose }) {
  const rows = [
    ["Recording duration", debug.duration != null ? `${debug.duration}s` : "—"],
    ["Audio blob size", debug.blobSize != null ? `${(debug.blobSize / 1024).toFixed(1)} KB (${debug.blobSize} bytes)` : "—"],
    ["Transcription service", debug.service || "—"],
    ["Transcript length", debug.rawTranscript != null ? `${debug.rawTranscript.length} chars` : "—"],
    ["Parse status", debug.parseStatus || "—"],
    ["Line items parsed", debug.lineItemCount != null ? String(debug.lineItemCount) : "—"],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border-2 border-signal bg-ink text-white p-4 shadow-hard font-mono text-xs"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold tracking-[0.2em] text-signal">🔬 VOX DEBUG</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-1">
            <span className="text-white/50">{k}</span>
            <span className="text-money font-bold text-right break-all">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="text-white/50 mb-1">Raw transcript</p>
        <p className="bg-black/40 rounded p-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto">
          {debug.rawTranscript || <span className="text-white/30">— nothing captured yet —</span>}
        </p>
      </div>
    </motion.div>
  );
}