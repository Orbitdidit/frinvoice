import { Package } from "lucide-react";
import SkinPayButton from "./SkinPayButton";
import { formatMoney, formatDate, projectTitle, splitLineItem, isPaidStatus } from "./helpers";

const C = {
  bg: "#141210",
  panel: "#1c1916",
  line: "#2a2620",
  gold: "#c9a860",
  text: "#efe9df",
  muted: "#928a7b",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', ui-monospace, monospace";

export default function LuxeSkin({ invoice, companyInfo }) {
  const isPaid = isPaidStatus(invoice);
  const name = companyInfo?.company_name || "INVOX User";
  const lineItems = invoice.line_items || [];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SERIF }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* (1) Header row */}
        <div className="flex justify-between items-start gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            {companyInfo?.company_logo_url && (
              <img src={companyInfo.company_logo_url} alt={name} style={{ width: 56, height: 56, objectFit: "contain" }} />
            )}
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: ".04em" }}>{name}</div>
              <div style={{ fontSize: 11, letterSpacing: ".32em", color: C.gold, marginTop: 6, textTransform: "uppercase", fontFamily: MONO }}>
                Bespoke {invoice.document_type === "estimate" ? "Estimate" : "Invoice"}
              </div>
            </div>
          </div>
          <div className="text-right" style={{ fontFamily: MONO, fontSize: 12, color: C.muted, lineHeight: 1.9 }}>
            <span
              style={{
                display: "inline-block",
                fontSize: 11,
                letterSpacing: ".2em",
                color: C.gold,
                border: `1px solid ${C.gold}`,
                padding: "5px 12px",
                borderRadius: 3,
              }}
            >
              {invoice.document_type === "estimate" ? "EST" : "INV"} {invoice.invoice_number || "—"}
            </span>
            <div style={{ marginTop: 10 }}>ISSUED — {formatDate(invoice.invoice_date)}</div>
            <div>{invoice.document_type === "estimate" ? "VALID THRU" : "DUE"} — {formatDate(invoice.due_date)}</div>
          </div>
        </div>

        {/* (2) Hero visual — project name in large italic serif with thin gold rules */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ height: 1, background: C.gold, opacity: 0.6 }} />
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(30px, 5.5vw, 56px)", lineHeight: 1.2, padding: "28px 0", color: C.text }}>
            {projectTitle(invoice)}
          </div>
          <div style={{ height: 1, background: C.gold, opacity: 0.6 }} />
        </div>

        {/* (3) BILLED TO / FROM */}
        <div className="grid md:grid-cols-2 gap-8" style={{ marginTop: 40 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".28em", color: C.gold, textTransform: "uppercase", fontFamily: MONO }}>Billed To</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{invoice.client_name || "—"}</div>
            {invoice.client_contact_person && <div style={{ color: C.muted, fontSize: 13 }}>Attn: {invoice.client_contact_person}</div>}
            {invoice.client_email && <div style={{ color: C.muted, fontSize: 13 }}>{invoice.client_email}</div>}
            {invoice.client_address && <div style={{ color: C.muted, fontSize: 13, whiteSpace: "pre-line" }}>{invoice.client_address}</div>}
          </div>
          <div className="md:text-right">
            <div style={{ fontSize: 10, letterSpacing: ".28em", color: C.gold, textTransform: "uppercase", fontFamily: MONO }}>From</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{name}</div>
            {companyInfo?.email && <div style={{ color: C.muted, fontSize: 13 }}>{companyInfo.email}</div>}
            {companyInfo?.phone && <div style={{ color: C.muted, fontSize: 13 }}>{companyInfo.phone}</div>}
          </div>
        </div>

        {/* (4) Line items table */}
        <div style={{ marginTop: 40 }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr auto", borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: ".28em", color: C.gold, textTransform: "uppercase", fontFamily: MONO }}>Item</div>
            <div style={{ fontSize: 10, letterSpacing: ".28em", color: C.gold, textTransform: "uppercase", fontFamily: MONO }}>Amount</div>
          </div>

          {lineItems.map((item, idx) => {
            const { name: itemName, desc } = splitLineItem(item);
            const thumb = item.file_urls?.[0] || item.thumbnail_url;
            return (
              <div
                key={idx}
                className="flex items-start justify-between gap-4"
                style={{ padding: "16px 0", borderBottom: `1px solid ${C.line}`, opacity: item.is_discount ? 0.85 : 1 }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {!item.is_discount &&
                    (thumb ? (
                      <img
                        src={thumb}
                        alt={itemName}
                        style={{ width: 88, height: 56, objectFit: "cover", border: `1px solid ${C.line}`, borderRadius: 2, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{ width: 88, height: 56, border: `1px solid ${C.line}`, borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.panel }}
                      >
                        <Package className="w-5 h-5" style={{ color: C.gold }} />
                      </div>
                    ))}
                  <div className="min-w-0">
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {item.quantity > 1 && !item.is_discount ? `${item.quantity}× ` : ""}
                      {itemName}
                    </div>
                    {desc && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, maxWidth: 440, marginTop: 4 }}>{desc}</div>}
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 15, whiteSpace: "nowrap", color: item.is_discount ? "#c98a60" : C.text }}>
                  {item.is_discount ? "-" : ""}${formatMoney(Math.abs(item.total || 0))}
                </div>
              </div>
            );
          })}
        </div>

        {/* (5) Totals */}
        <div className="flex justify-end" style={{ marginTop: 32 }}>
          <div style={{ width: 340, maxWidth: "100%", fontFamily: MONO }}>
            <div className="flex justify-between" style={{ fontSize: 13, color: C.muted, padding: "6px 0" }}>
              <span>Subtotal</span>
              <span>${formatMoney(invoice.subtotal)}</span>
            </div>
            {(invoice.discount_amount || 0) > 0 && (
              <div className="flex justify-between" style={{ fontSize: 13, color: C.muted, padding: "6px 0" }}>
                <span>Discounts</span>
                <span>-${formatMoney(invoice.discount_amount)}</span>
              </div>
            )}
            {(invoice.tax_amount || 0) > 0 && (
              <div className="flex justify-between" style={{ fontSize: 13, color: C.muted, padding: "6px 0" }}>
                <span>Tax ({invoice.tax_rate || 0}%)</span>
                <span>${formatMoney(invoice.tax_amount)}</span>
              </div>
            )}
            <div
              className="flex justify-between items-center"
              style={{ marginTop: 12, padding: "18px 20px", border: `1px solid ${C.gold}`, borderRadius: 6, background: "linear-gradient(180deg, rgba(201,168,96,.08), rgba(201,168,96,.02))" }}
            >
              <span style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.text }}>Total Due</span>
              <span style={{ fontSize: 24, color: C.gold, textShadow: "0 0 24px rgba(201,168,96,.35)" }}>${formatMoney(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* (6) Pay button */}
        <div style={{ marginTop: 40 }}>
          <SkinPayButton
            invoice={invoice}
            isPaid={isPaid}
            mutedColor={C.muted}
            style={{ background: C.gold, color: C.bg, boxShadow: "0 0 30px rgba(201,168,96,.35)" }}
          />
        </div>

        {/* (7) Terms */}
        {invoice.notes && (
          <div style={{ marginTop: 48, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: C.gold, fontFamily: MONO }}>Terms</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.9, marginTop: 10, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          </div>
        )}

        {/* (8) Footer */}
        <div style={{ textAlign: "center", marginTop: 56, fontSize: 11, letterSpacing: ".26em", color: C.gold, textTransform: "uppercase", fontFamily: MONO }}>
          {name}
        </div>
      </div>
    </div>
  );
}