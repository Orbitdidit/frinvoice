import { format } from "date-fns";

export function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(d) {
  if (!d) return "—";
  try {
    return format(new Date(d + "T12:00:00"), "MMM dd, yyyy");
  } catch {
    return d;
  }
}

export function projectTitle(invoice) {
  if (invoice.project_title) return invoice.project_title;
  const first =
    invoice.line_items?.find((i) => !i.is_discount) || invoice.line_items?.[0];
  return first?.description || invoice.notes?.split("\n")[0] || "Professional Services";
}

/**
 * Split a line item into a bold name + muted description.
 * If a separate detail exists, name = description, desc = detail.
 * Otherwise, name = first sentence of description, desc = the remainder.
 */
export function splitLineItem(item) {
  const desc = (item.description || "").trim();
  const detail = (item.detail || "").trim();
  if (detail) return { name: desc || "Item", desc: detail };

  const match = desc.match(/^(.*?[.!?])\s+(.*)$/);
  if (match && match[2]) return { name: match[1].trim(), desc: match[2].trim() };
  return { name: desc || "Item", desc: "" };
}

export function isPaidStatus(invoice) {
  return invoice.status === "paid" || invoice.payment_status === "paid";
}

/**
 * Per-skin theming for the shared mobile sticky pay bar.
 * bar = sticky bar background/border, style = the pay button treatment, muted = secondary text.
 */
export const SKIN_PAY_THEME = {
  ledger: {
    bar: "#fffdf7",
    barBorder: "#e6e0d0",
    muted: "#8a8372",
    style: { background: "#1f7a3d", color: "#fff" },
  },
  neon: {
    bar: "#0d0f16",
    barBorder: "#1b1f2c",
    muted: "#7c8496",
    style: { background: "#3ee6ff", color: "#07080c", boxShadow: "0 0 24px rgba(62,230,255,.4)" },
  },
  luxe: {
    bar: "#1c1916",
    barBorder: "#2a2620",
    muted: "#928a7b",
    style: { background: "#c9a860", color: "#141210" },
  },
};