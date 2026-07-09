import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/functions/createCheckoutSession";
import { formatMoney, formatDate, projectTitle, splitLineItem, isPaidStatus } from "@/components/public-invoice/helpers";

const SHOWPIECE_CSS = `
.showpiece-neon {
  --bg:#07080c;
  --panel:#0d0f16;
  --line:#1b1f2c;
  --cyan:#3ee6ff;
  --cyan-dim:#173a44;
  --amber:#ffb84d;
  --text:#e8ecf4;
  --muted:#7c8496;
  --mono:'Courier New',ui-monospace,monospace;
  background:var(--bg);
  color:var(--text);
  font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
  padding:48px 20px;
  min-height:100vh;
}
.showpiece-neon .sheet { max-width:860px; margin:0 auto; }

.showpiece-neon .sp-header {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  border-bottom:1px solid var(--line);
  padding-bottom:28px;
}
.showpiece-neon .sp-brand { font-size:26px; font-weight:800; letter-spacing:.14em; }
.showpiece-neon .sp-brand span { color:var(--cyan); }
.showpiece-neon .sp-tagline { font-size:11px; letter-spacing:.32em; color:var(--muted); margin-top:8px; }
.showpiece-neon .sp-meta {
  text-align:right;
  font-family:var(--mono);
  font-size:12px;
  color:var(--muted);
  line-height:2;
}
.showpiece-neon .sp-meta b { color:var(--text); font-weight:400; }
.showpiece-neon .sp-invoice-tag {
  display:inline-block;
  font-family:var(--mono);
  font-size:11px;
  letter-spacing:.2em;
  color:var(--cyan);
  border:1px solid var(--cyan-dim);
  padding:5px 12px;
  border-radius:3px;
  margin-bottom:6px;
}

.showpiece-neon .sp-hero { text-align:center; padding:40px 0; }
.showpiece-neon .sp-hero-label { font-family:var(--mono); font-size:11px; letter-spacing:.3em; color:var(--muted); margin-bottom:18px; }
.showpiece-neon .sp-wall {
  display:grid;
  grid-template-columns:repeat(10,1fr);
  gap:3px;
  max-width:640px;
  aspect-ratio:640/288;
  margin:0 auto;
  padding:10px;
  background:#000;
  border:1px solid var(--line);
  border-radius:6px;
  box-shadow:0 0 60px rgba(62,230,255,.07), inset 0 0 30px rgba(0,0,0,.9);
}
.showpiece-neon .px {
  background:var(--cyan);
  border-radius:1px;
  animation:sp-glow 3.4s ease-in-out infinite;
}
@keyframes sp-glow {
  0%,100% { opacity:.10; }
  50% { opacity:.55; }
}
.showpiece-neon .sp-stats {
  display:flex;
  justify-content:center;
  gap:36px;
  margin-top:28px;
  font-family:var(--mono);
  font-size:12px;
  color:var(--muted);
}
.showpiece-neon .sp-stat { text-align:center; }
.showpiece-neon .sp-stat-value { display:block; font-size:15px; color:var(--cyan); margin-bottom:4px; }

.showpiece-neon .sp-parties {
  display:flex;
  gap:48px;
  padding:34px 0;
  border-bottom:1px solid var(--line);
}
.showpiece-neon .sp-party { flex:1; }
.showpiece-neon .sp-party h4 { font-family:var(--mono); font-size:10px; letter-spacing:.28em; color:var(--muted); margin:0 0 10px; font-weight:400; }
.showpiece-neon .sp-party-name { font-weight:700; font-size:15px; }
.showpiece-neon .sp-party-line { font-size:13px; color:var(--muted); margin-top:4px; }

.showpiece-neon .sp-table { width:100%; border-collapse:collapse; }
.showpiece-neon .sp-table th {
  font-family:var(--mono);
  font-size:10px;
  letter-spacing:.24em;
  color:var(--muted);
  border-bottom:1px solid var(--line);
  padding:0 8px 12px;
  text-align:left;
  font-weight:400;
}
.showpiece-neon .sp-table th.right { text-align:right; }
.showpiece-neon .sp-table td { padding:20px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
.showpiece-neon .sp-item { display:flex; gap:16px; align-items:flex-start; }
.showpiece-neon .sp-thumb {
  width:88px;
  height:56px;
  flex-shrink:0;
  border:1px solid var(--line);
  background:#000;
  border-radius:5px;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
}
.showpiece-neon .sp-thumb img { width:100%; height:100%; object-fit:cover; }
.showpiece-neon .sp-item-name { font-size:15px; font-weight:600; }
.showpiece-neon .sp-item-desc { font-size:12.5px; color:var(--muted); line-height:1.6; max-width:440px; margin-top:6px; }
.showpiece-neon .sp-price { text-align:right; font-family:var(--mono); font-size:15px; white-space:nowrap; }

.showpiece-neon .sp-totals { display:flex; justify-content:flex-end; padding:34px 0; }
.showpiece-neon .sp-totals-box { min-width:300px; }
.showpiece-neon .sp-sub-row {
  display:flex;
  justify-content:space-between;
  font-family:var(--mono);
  font-size:13px;
  color:var(--muted);
  padding:6px 4px;
}
.showpiece-neon .sp-grand {
  display:flex;
  justify-content:space-between;
  align-items:center;
  border:1px solid var(--cyan-dim);
  border-radius:6px;
  padding:16px 18px;
  margin-top:14px;
  background:linear-gradient(180deg,rgba(62,230,255,.06),rgba(62,230,255,.02));
}
.showpiece-neon .sp-grand-label { font-size:11px; letter-spacing:.22em; }
.showpiece-neon .sp-grand-amount {
  font-family:var(--mono);
  font-size:24px;
  color:var(--cyan);
  font-weight:700;
  text-shadow:0 0 24px rgba(62,230,255,.45);
}

.showpiece-neon .sp-pay {
  width:100%;
  background:var(--cyan);
  color:#07080c;
  font-weight:700;
  border:none;
  border-radius:6px;
  padding:16px 34px;
  box-shadow:0 0 34px rgba(62,230,255,.45);
  cursor:pointer;
  font-size:15px;
  letter-spacing:.06em;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
}
.showpiece-neon .sp-pay:disabled { opacity:.7; cursor:default; }
.showpiece-neon .sp-paid {
  width:100%;
  text-align:center;
  border:1px solid var(--cyan-dim);
  border-radius:6px;
  padding:16px 34px;
  color:var(--cyan);
  font-weight:700;
  letter-spacing:.06em;
}

.showpiece-neon .sp-terms {
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:6px;
  padding:24px;
  margin-top:34px;
}
.showpiece-neon .sp-terms h5 { font-family:var(--mono); font-size:10px; letter-spacing:.28em; color:var(--amber); margin:0 0 12px; font-weight:400; }
.showpiece-neon .sp-terms p { font-size:12.5px; color:var(--muted); line-height:1.9; margin:0; white-space:pre-wrap; }

.showpiece-neon .sp-footer {
  text-align:center;
  font-family:var(--mono);
  font-size:11px;
  letter-spacing:.26em;
  color:var(--muted);
  margin-top:40px;
}
.showpiece-neon .sp-footer span { color:var(--cyan); }

@media (max-width:640px) {
  .showpiece-neon .sp-header { flex-direction:column; gap:20px; }
  .showpiece-neon .sp-meta { text-align:left; }
  .showpiece-neon .sp-parties { flex-direction:column; gap:28px; }
}
`;

const DEFAULT_STATS = [
  { value: "TURNKEY", label: "Delivery" },
  { value: "PREMIUM", label: "Grade" },
  { value: "CERTIFIED", label: "Install" },
  { value: "WARRANTY", label: "Coverage" },
];

const ThumbIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3ee6ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 15l4-4a2 2 0 0 1 3 0l5 5" />
    <circle cx="8.5" cy="9.5" r="1.5" />
  </svg>
);

function PayButton({ invoice }) {
  const [isLoading, setIsLoading] = useState(false);
  const paid = isPaidStatus(invoice);

  const handlePay = async () => {
    setIsLoading(true);
    try {
      const response = await createCheckoutSession({
        invoice_id: invoice.id,
        return_url: window.location.origin,
      });
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data?.error || "Failed to create checkout session");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      alert(`Failed to initiate payment: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (paid) {
    return <div className="sp-paid">✓ PAYMENT RECEIVED — THANK YOU</div>;
  }

  return (
    <button type="button" className="sp-pay no-print" onClick={handlePay} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          PROCESSING…
        </>
      ) : (
        <>PAY SECURELY · ${formatMoney(invoice.total_amount)}</>
      )}
    </button>
  );
}

export default function ShowpieceNeon({ invoice, companyInfo }) {
  // 60 randomized glow delays for the LED wall.
  const cells = useMemo(
    () => Array.from({ length: 60 }, () => (Math.random() * 3.4).toFixed(2)),
    []
  );

  const rawName = companyInfo?.company_name || "INVOX STUDIO";
  const nameParts = rawName.trim().split(/\s+/);
  const cyanWord = nameParts.length > 1 ? nameParts.pop() : "";
  const brandLead = nameParts.join(" ");
  const tagline = companyInfo?.tagline || "SPEAK IT · SEND IT · GET PAID";

  const stats = (invoice.hero_stats && invoice.hero_stats.length > 0)
    ? invoice.hero_stats.slice(0, 4)
    : DEFAULT_STATS;

  const items = (invoice.line_items || []).filter((i) => !i.is_discount);
  const discounts = (invoice.line_items || []).filter((i) => i.is_discount);

  return (
    <div className="showpiece-neon">
      <style>{SHOWPIECE_CSS}</style>
      <div className="sheet">
        {/* HEADER */}
        <div className="sp-header">
          <div>
            <div className="sp-brand">
              {brandLead}
              {cyanWord && <> <span>{cyanWord}</span></>}
            </div>
            <div className="sp-tagline">{tagline}</div>
          </div>
          <div className="sp-meta">
            <div className="sp-invoice-tag">{invoice.document_type === "estimate" ? "ESTIMATE" : "INVOICE"}</div>
            <div>NO. <b>{invoice.invoice_number || "—"}</b></div>
            <div>ISSUED <b>{formatDate(invoice.invoice_date)}</b></div>
            <div>{invoice.document_type === "estimate" ? "VALID" : "DUE"} <b>{formatDate(invoice.due_date)}</b></div>
          </div>
        </div>

        {/* HERO */}
        <div className="sp-hero">
          <div className="sp-hero-label">{projectTitle(invoice)}</div>
          <div className="sp-wall">
            {cells.map((delay, i) => (
              <div key={i} className="px" style={{ animationDelay: `${delay}s` }} />
            ))}
          </div>
          <div className="sp-stats">
            {stats.map((s, i) => (
              <div key={i} className="sp-stat">
                <span className="sp-stat-value">{s.value}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* PARTIES */}
        <div className="sp-parties">
          <div className="sp-party">
            <h4>FROM</h4>
            <div className="sp-party-name">{rawName}</div>
            {companyInfo?.company_email && <div className="sp-party-line">{companyInfo.company_email}</div>}
            {companyInfo?.company_phone && <div className="sp-party-line">{companyInfo.company_phone}</div>}
            {companyInfo?.company_address && <div className="sp-party-line">{companyInfo.company_address}</div>}
          </div>
          <div className="sp-party">
            <h4>BILLED TO</h4>
            <div className="sp-party-name">{invoice.client_company || invoice.client_name}</div>
            {invoice.client_contact_person && <div className="sp-party-line">{invoice.client_contact_person}</div>}
            {invoice.client_company && invoice.client_name && <div className="sp-party-line">{invoice.client_name}</div>}
            {invoice.client_email && <div className="sp-party-line">{invoice.client_email}</div>}
            {invoice.client_phone && <div className="sp-party-line">{invoice.client_phone}</div>}
          </div>
        </div>

        {/* ITEMS */}
        <table className="sp-table">
          <thead>
            <tr>
              <th>LINE ITEM</th>
              <th className="right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const { name, desc } = splitLineItem(item);
              const img = item.thumbnail_url || (item.file_urls && item.file_urls[0]);
              return (
                <tr key={i}>
                  <td>
                    <div className="sp-item">
                      <div className="sp-thumb">
                        {img ? <img src={img} alt={name} /> : <ThumbIcon />}
                      </div>
                      <div>
                        <div className="sp-item-name">{name}</div>
                        {desc && <div className="sp-item-desc">{desc}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="sp-price">${formatMoney(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="sp-totals">
          <div className="sp-totals-box">
            <div className="sp-sub-row">
              <span>SUBTOTAL</span>
              <span>${formatMoney(invoice.subtotal)}</span>
            </div>
            {discounts.map((d, i) => {
              const { name } = splitLineItem(d);
              return (
                <div key={i} className="sp-sub-row">
                  <span>{(name || "DISCOUNT").toUpperCase()}</span>
                  <span>${formatMoney(d.total)}</span>
                </div>
              );
            })}
            {invoice.tax_amount > 0 && (
              <div className="sp-sub-row">
                <span>TAX ({invoice.tax_rate || 0}%)</span>
                <span>${formatMoney(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="sp-grand">
              <span className="sp-grand-label">{invoice.document_type === "estimate" ? "ESTIMATE TOTAL" : "TOTAL DUE"}</span>
              <span className="sp-grand-amount">${formatMoney(invoice.total_amount)}</span>
            </div>
            <div style={{ marginTop: "16px" }}>
              <PayButton invoice={invoice} />
            </div>
          </div>
        </div>

        {/* TERMS */}
        {invoice.notes && (
          <div className="sp-terms">
            <h5>TERMS &amp; NOTES</h5>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="sp-footer">
          POWERED BY <span>{rawName}</span>
        </div>
      </div>
    </div>
  );
}