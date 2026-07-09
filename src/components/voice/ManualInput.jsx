import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function ManualInput({ value, onChange, isProcessing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      <p className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-ink">Describe your invoice</p>

      {/* Paper note card */}
      <div className="rounded-md border-2 border-dashed border-ink bg-[#fffdf7] p-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Create an invoice for ABC Company for logo design work, 5 hours at $100/hour, plus a website mockup for $300…"
          rows={6}
          className="bg-transparent border-0 shadow-none focus-visible:ring-0 font-mono text-sm text-ink placeholder:text-ink/40 resize-none"
          disabled={isProcessing}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] text-ink/60">
        <span>Be specific — client, services, quantities, pricing, discounts.</span>
        {value && <span>{value.length} chars</span>}
      </div>
    </motion.div>
  );
}