import { Package } from "lucide-react";
import SkinPayButton from "./SkinPayButton";
import { formatMoney, formatDate, splitLineItem, isPaidStatus } from "./helpers";

const C = {
  bg: "#07080c",
  panel: "#0d0f16",
  line: "#1b1f2c",
  cyan: "#3ee6ff",
  cyanDim: "#173a44",
  amber: "#ffb84d",
  text: "#e8ecf4",
  muted: "#7c8496",
};
const MONO = "'Courier New', ui-monospace, monospace";

function NeonGrid() {
  const cells = Array.from({ length: 60 });
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 3,
        padding: 10,
        background: "#000",
        border: `1px solid ${C.line}`,
        borderRadius: 6,
        boxShadow: "0 0 60px rgba(62,230,255,.07)",
      }}
    >
      {cells.map((_, i) => (
        <div
          key={i}
          style={{
            aspectRatio: "1 / 1",
            background: C.cyan,
            borderRadius: 1,
            opacity: 0.1,
            animation: `neonGlow 3.4s ease-in-out ${((i * 53) % 34) / 10}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export default function NeonSkin({ invoice, companyInfo }) {
  const isPaid = isPaidStatus(invoice);
  const name = companyInfo?.company_name || "INVOX User";
  const heroStats = (invoice.hero_stats || []).filter((s) => s && (s.label || s.value)).slice(0, 4);

  // Split brand name so the last word is accented in cyan.
  const parts = name.trim().split(" ");
  const brandHead = parts.length > 1 ? parts.slice(0, -1).join(" ") + " " : "";
  const brandTail = parts.length > 1 ? parts[parts.length - 1] : name;

  const lineItems = invoice.line_items || [];

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: MONO, minHeight: "100vh" }}>
      <style>{`@keyframes neonGlow { 0% { opacity: .10 } 100% { opacity: .55 } }`}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* (1) Header row */}
        <div className="flex justify-between items-start gap-6 flex-wrap">
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".14em" }}>
              {brandHead}
              <span style={{ color: C.cyan }}>{brandTail}</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: ".32em", color: C.muted, marginTop: 6, textTransform: "uppercase" }}>
              Speak it · Send it · Get paid
            </div>
          </div>
          <div className="text-right" style={{ fontSize: 12, color: C.muted, lineHeight: 1.9 }}>
            <span
              style={{
                display: "inline-block",
                fontSize: 11,
                letterSpacing: ".2em",
                color: C.cyan,
                border: `1px solid ${C.cyanDim}`,
                padding: "5px 12px",
                borderRadius: 3,
              }}
            >
              {invoice.document_type === "estimate" ? "EST" : "INV"} {invoice.invoice_number || "—"}
            </span>
            <div style={{ marginTop: 10 }}>ISSUED — {formatDate(invoice.invoice_date)}</div>
            <div>{invoice.document_type === "estimate" ? "VALID THRU" : "DUE"} — {formatDate(invoice.due_date)}</div>
            {invoice.project_title && <div style={{ color: C.text }}>{invoice.project_title}</div>}
          </div>
        </div>

        {/* (2) Hero visual — LED grid + stats */}
        <div style={{ marginTop: 32 }}>
          <NeonGrid />
          {heroStats.length > 0 && (
            <div className="grid gap-3" style={{ marginTop: 16, gridTemplateColumns: `repeat(${heroStats.length}, minmax(0, 1fr))` }}>
              {heroStats.map((s, i) => (
                <div
                  key={i}
                  style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 14px" }}
                >
                  <div style={{ fontSize: 15, color: C.cyan }}>{s.value || "—"}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* (3) BILLED TO / FROM */}
        <div className="grid md:grid-cols-2 gap-8" style={{ marginTop: 40 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".24em", color: C.muted, textTransform: "uppercase" }}>Billed To</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{invoice.client_name || "—"}</div>
            {invoice.client_contact_person && <div style={{ color: C.muted, fontSize: 12.5 }}>Attn: {invoice.client_contact_person}</div>}
            {invoice.client_email && <div style={{ color: C.muted, fontSize: 12.5 }}>{invoice.client_email}</div>}
            {invoice.client_address && <div style={{ color: C.muted, fontSize: 12.5, whiteSpace: "pre-line" }}>{invoice.client_address}</div>}
          </div>
          <div className="md:text-right">
            <div style={{ fontSize: 10, letterSpacing: ".24em", color: C.muted, textTransform: "uppercase" }}>From</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{name}</div>
            {companyInfo?.email && <div style={{ color: C.muted, fontSize: 12.5 }}>{companyInfo.email}</div>}
            {companyInfo?.phone && <div style={{ color: C.muted, fontSize: 12.5 }}>{companyInfo.phone}</div>}
          </div>
        </div>

        {/* (4) Line items table */}
        <div style={{ marginTop: 40 }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr auto", borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: ".24em", color: C.muted, textTransform: "uppercase" }}>Item</div>
            <div style={{ fontSize: 10, letterSpacing: ".24em", color: C.muted, textTransform: "uppercase" }}>Amount</div>
          </div>

          {lineItems.map((item, idx) => {
            const { name: itemName, desc } = splitLineItem(item);
            const thumb = item.file_urls?.[0] || item.thumbnail_url;
            return (
              <div
                key={idx}
                className="flex items-start justify-between gap-4"
                style={{ padding: "16px 0", borderBottom: `1px solid ${C.line}`, opacity: item.is_discount ? 0.8 : 1 }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {!item.is_discount &&
                    (thumb ? (
                      <img
                        src={thumb}
                        alt={itemName}
                        style={{ width: 88, height: 56, objectFit: "cover", border: `1px solid ${C.line}`, background: "#000", borderRadius: 2, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{ width: 88, height: 56, border: `1px solid ${C.line}`, background: "#000", borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Package className="w-5 h-5" style={{ color: C.cyanDim }} />
                      </div>
                    ))}
                  <div className="min-w-0">
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {item.quantity > 1 && !item.is_discount ? `${item.quantity}× ` : ""}
                      {itemName}
                    </div>
                    {desc && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, maxWidth: 440, marginTop: 4 }}>{desc}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 15, whiteSpace: "nowrap", color: item.is_discount ? C.amber : C.text }}>
                  {item.is_discount ? "-" : ""}${formatMoney(Math.abs(item.total || 0))}
                </div>
              </div>
            );
          })}
        </div>

        {/* (5) Totals */}
        <div className="flex justify-end" style={{ marginTop: 32 }}>
          <div style={{ width: 340, maxWidth: "100%" }}>
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
              style={{
                marginTop: 12,
                padding: "18px 20px",
                border: `1px solid ${C.cyanDim}`,
                borderRadius: 6,
                background: "linear-gradient(180deg, rgba(62,230,255,.06), rgba(62,230,255,.02))",
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.text }}>Total Due</span>
              <span style={{ fontSize: 24, color: C.cyan, textShadow: "0 0 24px rgba(62,230,255,.45)" }}>
                ${formatMoney(invoice.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* (6) Pay button — inline on desktop; on mobile the sticky bar handles it */}
        <div className="no-print hidden md:block" style={{ marginTop: 40 }}>
          <SkinPayButton
            invoice={invoice}
            isPaid={isPaid}
            mutedColor={C.muted}
            style={{ background: C.cyan, color: C.bg, boxShadow: "0 0 34px rgba(62,230,255,.45)" }}
          />
        </div>

        {/* (7) Terms */}
        {invoice.notes && (
          <div style={{ marginTop: 48, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: C.amber }}>Terms</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.9, marginTop: 10, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          </div>
        )}

        {/* (8) Footer */}
        <div style={{ textAlign: "center", marginTop: 56, fontSize: 11, letterSpacing: ".26em", color: C.muted, textTransform: "uppercase" }}>
          {brandHead}
          <span style={{ color: C.cyan }}>{brandTail}</span>
        </div>
      </div>
    </div>
  );
}