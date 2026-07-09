import React, { useState, useEffect, useMemo } from "react";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SendEmailModal from "@/components/invoices/SendEmailModal";
import StampBadge from "@/components/StampBadge";

const PIPELINE = [
  {
    key: "draft",
    label: "Draft",
    // ink-black header bar, paper text
    headerBar: "bg-ink text-paper",
    cardBg: "bg-card",
    amount: "text-ink",
    sub: "text-ink/60",
  },
  {
    key: "sent",
    label: "Sent",
    // mustard header bar, ink text
    headerBar: "bg-mustard text-ink",
    cardBg: "bg-card",
    amount: "text-ink",
    sub: "text-ink/60",
  },
  {
    key: "viewed",
    label: "Viewed",
    // cobalt header bar, white text
    headerBar: "bg-cobalt text-white",
    cardBg: "bg-card",
    amount: "text-ink",
    sub: "text-ink/60",
  },
  {
    key: "paid",
    label: "Paid",
    // fully color-blocked money green: solid green card, darker-green header bar, all white text
    headerBar: "bg-green-dark text-white border-b-2 border-green-dark",
    cardBg: "bg-money",
    amount: "text-white",
    sub: "text-white/80",
    fullBlock: true,
  },
];

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followUpInvoice, setFollowUpInvoice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      const invoiceData = await Invoice.filter({ created_by: user.email }, "-created_date");
      setInvoices(invoiceData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const by = (status) => invoices.filter((i) => i.status === status);
    const sum = (list) => list.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const draft = by("draft");
    const sent = by("sent");
    const viewed = by("viewed");
    const paid = by("paid");
    const overdue = by("overdue");
    return {
      draft: { count: draft.length, total: sum(draft) },
      sent: { count: sent.length, total: sum(sent) },
      viewed: { count: viewed.length, total: sum(viewed) },
      paid: { count: paid.length, total: sum(paid) },
      overdue: { count: overdue.length, total: sum(overdue) },
    };
  }, [invoices]);

  const recentInvoices = invoices.slice(0, 8);

  const handleViewInvoice = (id) => navigate(createPageUrl(`InvoiceDetail?id=${id}`));

  const openFollowUp = (invoice) => {
    const companyName = "our team";
    const presetSubject = `Friendly follow-up: Invoice ${invoice.invoice_number}`;
    const presetBody = `Hi ${invoice.client_name || "there"},

Just a friendly nudge regarding invoice ${invoice.invoice_number} for $${formatMoney(invoice.total_amount)}.

If you've already sent payment, thank you — please disregard this note. Otherwise, you can view and pay the invoice here:
${window.location.origin}${createPageUrl(`PublicInvoice?id=${invoice.id}`)}

Happy to answer any questions.

Best,
${companyName}`;
    setFollowUpInvoice({ invoice, presetSubject, presetBody });
  };

  const projectDescription = (inv) => {
    const first = inv.line_items?.[0];
    return first?.description || first?.detail || inv.notes?.split("\n")[0] || "—";
  };

  return (
    <div className="min-h-screen bg-money-paper p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] eyebrow text-money">Money Pipeline</p>
            <h1 className="title-underline font-poster text-ink text-[42px] md:text-[48px] leading-none mt-1">Dashboard</h1>
          </div>
          <Link to={createPageUrl("CreateInvoice")}>
            <Button variant="signal">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Layered frame panel: tan surface with an ink header bar bolted to its top edge */}
        <div
          className="overflow-hidden"
          style={{
            background: "var(--tan)",
            border: "2px solid #17150f",
            boxShadow: "6px 6px 0 #17150f",
            borderRadius: "6px",
          }}
        >
          {/* Ink header bar */}
          <div
            className="flex items-center justify-between gap-4"
            style={{
              background: "#17150f",
              color: "#f4f0e6",
              padding: "10px 20px",
              borderRadius: "4px 4px 0 0",
            }}
          >
            <span style={{ fontFamily: "Archivo, system-ui, sans-serif", fontWeight: 900, fontSize: "14px", letterSpacing: ".08em" }}>
              INVOX
            </span>
            <nav className="flex items-center gap-4" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: ".2em" }}>
              <span style={{ borderBottom: "2px solid #d9a441", paddingBottom: "2px" }}>PIPELINE</span>
              <span style={{ opacity: 0.65 }}>CLIENTS</span>
              <span style={{ opacity: 0.65 }}>REPORTS</span>
            </nav>
          </div>

          {/* Frame interior */}
          <div className="p-5 md:p-7 space-y-8">
            {/* Stat columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {PIPELINE.map((col, idx) => {
                const s = stats[col.key];
                return (
                  <motion.div
                    key={col.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card-hard overflow-hidden"
                    style={{ background: col.fullBlock ? "#1f7a3d" : "var(--cream)" }}
                  >
                    <div className={`px-4 py-2 ${col.headerBar} ${col.fullBlock ? "" : "border-b-2 border-ink"}`}>
                      <p className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase">{col.label}</p>
                    </div>
                    <div className="p-4 md:p-5">
                      <p className={`font-amount tabular-nums text-[28px] md:text-[32px] leading-none ${col.amount}`}>
                        ${formatMoney(s.total)}
                      </p>
                      <p className={`text-xs font-mono mt-1 ${col.sub}`}>{s.count} {s.count === 1 ? "invoice" : "invoices"}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Overdue card (conditional) */}
            {stats.overdue.count > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hard overflow-hidden bg-stamp text-white"
              >
                <div className="p-4 md:p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-white">Overdue</p>
                    <p className="mt-2 font-amount tabular-nums text-[28px] md:text-[32px] leading-none text-white">
                      ${formatMoney(stats.overdue.total)}
                    </p>
                    <p className="text-xs font-mono text-white/80 mt-1">{stats.overdue.count} overdue {stats.overdue.count === 1 ? "invoice" : "invoices"}</p>
                  </div>
                  <Button variant="secondary" onClick={() => navigate(createPageUrl("Invoices"))}>
                    Review
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Recent invoices — own white inner card, reads as top layer on tan */}
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #17150f",
                boxShadow: "4px 4px 0 #17150f",
                borderRadius: "6px",
              }}
              className="p-4 md:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-header text-sm text-ink">Recent Invoices</h2>
                <Link to={createPageUrl("Invoices")} className="text-xs font-mono font-semibold text-money hover:text-ink">
                  View all →
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 bg-sand rounded-md border-2 border-ink shadow-hard-sm animate-pulse" />
                  ))}
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="text-center py-10">
                  <p className="font-mono text-ink text-lg">🧾 nothing printing yet</p>
                  <p className="text-sm font-mono text-ink/60 mt-2">go make some money — create your first invoice.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentInvoices.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      onView={() => handleViewInvoice(inv.id)}
                      onFollowUp={() => openFollowUp(inv)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up email modal */}
      {followUpInvoice && (
        <SendEmailModal
          isOpen={true}
          onClose={() => setFollowUpInvoice(null)}
          invoice={followUpInvoice.invoice}
          invoiceUrl={`${window.location.origin}${createPageUrl(`PublicInvoice?id=${followUpInvoice.invoice.id}`)}`}
          presetSubject={followUpInvoice.presetSubject}
          presetBody={followUpInvoice.presetBody}
        />
      )}
    </div>
  );
}

function InvoiceRow({ invoice, onView, onFollowUp }) {
  const isViewed = invoice.status === "viewed";
  return (
    <div
      onClick={onView}
      className="group card-hard card-hard-hover bg-card p-3 md:p-4 flex items-center gap-3 md:gap-4 cursor-pointer"
    >
      {/* Stamp */}
      <div className="flex-shrink-0 w-16 md:w-20 flex justify-center">
        <StampBadge status={invoice.status} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono font-bold text-ink"
            style={{
              background: "var(--sand)",
              border: "1px solid #17150f",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "3px",
            }}
          >
            #{invoice.invoice_number || "—"}
          </span>
          {isViewed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFollowUp();
              }}
              className="text-[10px] md:text-xs font-mono font-semibold px-2 py-0.5 rounded-full border-2 border-money text-money hover:bg-money/10 transition-colors"
            >
              Follow up
            </button>
          )}
        </div>
        <p className="font-heading font-bold text-ink truncate">{invoice.client_name || "—"}</p>
        <p className="text-xs font-mono text-ink/50 truncate">{invoice.line_items?.[0]?.description || invoice.notes?.split("\n")[0] || "—"}</p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-base md:text-lg font-bold text-ink tabular-nums">
          ${formatMoney(invoice.total_amount)}
        </p>
      </div>
    </div>
  );
}