import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

const formatMoney = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Receipt-style preview panel with thermal-printer aesthetic.
 * Animates line-by-line printing when `invoiceData` is provided.
 */
export default function ThermalReceipt({ invoiceData, isProcessing }) {
  const [printedLines, setPrintedLines] = useState(0);

  // Reset animation when new invoice data arrives
  useEffect(() => {
    if (!invoiceData) {
      setPrintedLines(0);
      return;
    }
    setPrintedLines(0);
    const totalLines = 1 + (invoiceData.line_items?.length || 0); // client + items
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setPrintedLines(count);
      if (count >= totalLines) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [invoiceData]);

  const lineItems = invoiceData?.line_items || [];
  const clientShown = printedLines >= 1;
  const itemsShown = Math.max(0, printedLines - 1);
  const totalVisible = printedLines >= 1 + lineItems.length;

  return (
    <div className="relative max-w-sm mx-auto md:mx-0 w-full">
      {/* Dark printer header bar */}
      <div className="bg-[#17150f] text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          <span className="text-xs font-bold tracking-[0.2em]">INVOX THERMAL</span>
        </div>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-400/50" />
        </div>
      </div>

      {/* Receipt paper */}
      <div className="bg-white border-2 border-t-0 border-[#17150f] px-4 py-5 min-h-[400px] font-mono text-sm text-[#17150f] relative">
        {/* Empty state */}
        {!invoiceData && (
          <div className="text-center py-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400 mb-2">Awaiting input</p>
            <p className="text-slate-400 text-xs">Your receipt will print here</p>
          </div>
        )}

        {/* Printing... */}
        {invoiceData && isProcessing && (
          <div className="text-center py-10">
            <p className="text-xs animate-pulse">▌ printing...</p>
          </div>
        )}

        {/* Printed content */}
        {invoiceData && !isProcessing && (
          <div className="space-y-2">
            {/* Client name first */}
            <AnimatePresence>
              {clientShown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pb-2"
                >
                  <p className="text-[10px] tracking-[0.15em] uppercase text-slate-500">Bill To</p>
                  <p className="text-base font-bold">{invoiceData.client_name || "—"}</p>
                  {invoiceData.invoice_number && (
                    <p className="text-xs text-slate-500">#{invoiceData.invoice_number}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dashed separator */}
            {clientShown && (
              <div className="border-t border-dashed border-[#17150f] my-2" />
            )}

            {/* Line items slide in sequentially */}
            <div className="space-y-2">
              {lineItems.slice(0, itemsShown).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pb-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}
                        {item.description || "—"}
                      </p>
                      {item.detail && (
                        <p className="text-[10px] text-slate-500 truncate">{item.detail}</p>
                      )}
                    </div>
                    <p className="text-xs font-semibold tabular-nums whitespace-nowrap">
                      ${formatMoney(item.total ?? (item.quantity || 0) * (item.unit_price || 0))}
                    </p>
                  </div>
                  <div className="border-t border-dashed border-[#17150f]/30 mt-2" />
                </motion.div>
              ))}
            </div>

            {/* Total fades in */}
            <AnimatePresence>
              {totalVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="pt-3"
                >
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold tracking-[0.15em] uppercase">Total</span>
                    <span className="text-xl font-bold tabular-nums">${formatMoney(invoiceData.total_amount)}</span>
                  </div>

                  {/* READY rubber stamp slam */}
                  <motion.div
                    initial={{ scale: 2.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 12 }}
                    className="mt-4 flex justify-center"
                  >
                    <span
                      className="inline-block px-3 py-1 border-2 border-green-600 text-green-700 text-xs font-bold tracking-[0.2em] rounded"
                      style={{ transform: "rotate(-6deg)" }}
                    >
                      READY
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Perforated bottom edge */}
        <div
          className="absolute -bottom-2 left-0 right-0 h-3"
          style={{
            background:
              "radial-gradient(circle at 4px 0px, transparent 3px, #17150f 3px, #17150f 4px, transparent 4px)",
            backgroundSize: "10px 6px",
            backgroundPosition: "0 0",
          }}
        />
      </div>
    </div>
  );
}