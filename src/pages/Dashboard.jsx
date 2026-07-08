import React, { useState, useEffect, useMemo } from "react";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SendEmailModal from "@/components/invoices/SendEmailModal";

const PIPELINE = [
  { key: "draft", label: "Draft", accent: "slate" },
  { key: "sent", label: "Sent", accent: "blue" },
  { key: "viewed", label: "Viewed", accent: "purple" },
  { key: "paid", label: "Paid", accent: "green" },
];

const ACCENTS = {
  slate: {
    bar: "bg-slate-400",
    text: "text-slate-700",
    amount: "text-slate-900",
    sub: "text-slate-500",
    ring: "border-slate-200",
  },
  blue: {
    bar: "bg-blue-500",
    text: "text-blue-700",
    amount: "text-blue-900",
    sub: "text-blue-600",
    ring: "border-blue-200",
  },
  purple: {
    bar: "bg-purple-500",
    text: "text-purple-700",
    amount: "text-purple-900",
    sub: "text-purple-600",
    ring: "border-purple-200",
  },
  green: {
    bar: "bg-green-500",
    text: "text-green-700",
    amount: "text-green-700",
    sub: "text-green-600",
    ring: "border-green-200",
  },
  red: {
    bar: "bg-red-500",
    text: "text-red-700",
    amount: "text-red-700",
    sub: "text-red-600",
    ring: "border-red-200",
  },
};

const STAMP_STYLES = {
  draft: "border-slate-400 text-slate-500",
  sent: "border-blue-500 text-blue-600",
  viewed: "border-purple-500 text-purple-600",
  paid: "border-green-600 text-green-700",
  overdue: "border-red-600 text-red-600",
  cancelled: "border-slate-400 text-slate-400",
  accepted: "border-emerald-600 text-emerald-700",
  declined: "border-rose-600 text-rose-600",
};

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
    <div className="min-h-screen bg-stone-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">Money Pipeline</p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          </div>
          <Link to={createPageUrl("CreateInvoice")}>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Stat columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {PIPELINE.map((col, idx) => {
            const s = stats[col.key];
            const a = ACCENTS[col.accent];
            return (
              <motion.div
                key={col.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative bg-white rounded-xl border ${a.ring} p-4 md:p-5 overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 h-full w-1 ${a.bar}`} />
                <p className={`text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase ${a.text}`}>{col.label}</p>
                <p className={`mt-2 text-xl md:text-3xl font-bold tabular-nums ${a.amount}`}>
                  ${formatMoney(s.total)}
                </p>
                <p className={`text-xs ${a.sub}`}>{s.count} {s.count === 1 ? "invoice" : "invoices"}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Overdue card (conditional) */}
        {stats.overdue.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative bg-white rounded-xl border ${ACCENTS.red.ring} p-4 md:p-5 overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 h-full w-1 ${ACCENTS.red.bar}`} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase text-red-700">Overdue</p>
                <p className="mt-2 text-xl md:text-3xl font-bold tabular-nums text-red-700">
                  ${formatMoney(stats.overdue.total)}
                </p>
                <p className="text-xs text-red-600">{stats.overdue.count} overdue {stats.overdue.count === 1 ? "invoice" : "invoices"}</p>
              </div>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => navigate(createPageUrl("Invoices"))}>
                Review
              </Button>
            </div>
          </motion.div>
        )}

        {/* Recent invoices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-600">Recent Invoices</h2>
            <Link to={createPageUrl("Invoices")} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">No invoices yet</p>
              <p className="text-sm text-slate-500 mt-1">Create your first invoice to start the pipeline.</p>
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
      className="group bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Stamp */}
      <div className="flex-shrink-0 w-16 md:w-20 flex justify-center">
        <StampBadge status={invoice.status} pulse={isViewed} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs md:text-sm font-semibold text-slate-500">
            #{invoice.invoice_number || "—"}
          </span>
          {isViewed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFollowUp();
              }}
              className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Follow up
            </button>
          )}
        </div>
        <p className="font-semibold text-slate-900 truncate">{invoice.client_name || "—"}</p>
        <p className="text-xs text-slate-500 truncate">{invoice.line_items?.[0]?.description || invoice.notes?.split("\n")[0] || "—"}</p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-base md:text-lg font-semibold text-slate-900 tabular-nums">
          ${formatMoney(invoice.total_amount)}
        </p>
      </div>
    </div>
  );
}

function StampBadge({ status, pulse }) {
  const cls = STAMP_STYLES[status] || STAMP_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-1 border-2 ${cls} text-[10px] md:text-xs font-bold tracking-[0.12em] uppercase rounded-md ${pulse ? "animate-pulse" : ""}`}
      style={{ transform: "rotate(-4deg)" }}
    >
      {status}
    </span>
  );
}