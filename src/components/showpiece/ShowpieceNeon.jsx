import React, { useMemo } from 'react';

export default function ShowpieceNeon({ invoice, business, onPay }) {
  const wallCells = useMemo(() => Array.from({ length: 60 }, () => (Math.random() * 3.4).toFixed(2)), []);
  const accent = invoice?.skin_accent || '#3ee6ff';

  const items = invoice?.line_items || [];
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="neon-root">
      <style>{`
        .neon-root{
          --bg:#07080c; --panel:#0d0f16; --line:#1b1f2c;
          --cyan:${accent}; --cyan-dim:#173a44; --amber:#ffb84d;
          --text:#e8ecf4; --muted:#7c8496;
          --mono:'Courier New', ui-monospace, monospace;
          background:var(--bg); color:var(--text);
          font-family:'Segoe UI', -apple-system, Helvetica, Arial, sans-serif;
          padding:48px 20px; min-height:100vh;
          -webkit-font-smoothing:antialiased;
        }
        .neon-root *{margin:0;padding:0;box-sizing:border-box}
        .neon-sheet{max-width:860px;margin:0 auto}
        .neon-head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid var(--line)}
        .neon-brand{font-size:26px;font-weight:800;letter-spacing:.14em}
        .neon-brand span{color:var(--cyan)}
        .neon-brand small{display:block;font-size:11px;font-weight:400;letter-spacing:.32em;color:var(--muted);margin-top:6px}
        .neon-meta{text-align:right;font-family:var(--mono);font-size:12px;color:var(--muted);line-height:2}
        .neon-meta b{color:var(--text)}
        .neon-invtag{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--cyan);border:1px solid var(--cyan-dim);padding:5px 12px;border-radius:3px;margin-bottom:10px}
        .neon-wallwrap{padding:44px 0 12px;text-align:center}
        .neon-walllabel{font-family:var(--mono);font-size:11px;letter-spacing:.3em;color:var(--muted);margin-bottom:18px}
        .neon-wall{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;max-width:640px;margin:0 auto;aspect-ratio:640/288;padding:10px;background:#000;border:1px solid var(--line);border-radius:6px;box-shadow:0 0 60px rgba(62,230,255,.07), inset 0 0 30px rgba(0,0,0,.9)}
        .neon-px{background:var(--cyan);border-radius:1px;opacity:.14;animation:neonGlow 3.4s ease-in-out infinite}
        @keyframes neonGlow{0%,100%{opacity:.10}50%{opacity:.55}}
        @media (prefers-reduced-motion: reduce){.neon-px{animation:none;opacity:.35}}
        .neon-parties{display:flex;gap:48px;padding:34px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.9}
        .neon-parties h4{font-family:var(--mono);font-size:10px;letter-spacing:.28em;color:var(--muted);margin-bottom:8px}
        .neon-parties b{font-size:15px}
        .neon-table{width:100%;border-collapse:collapse;margin-top:8px}
        .neon-table th{font-family:var(--mono);font-size:10px;letter-spacing:.24em;color:var(--muted);text-align:left;padding:20px 8px 12px;border-bottom:1px solid var(--line);font-weight:400}
        .neon-table th:last-child,.neon-table td:last-child{text-align:right}
        .neon-table td{padding:20px 8px;border-bottom:1px solid var(--line);vertical-align:top}
        .neon-itemname{font-weight:600;font-size:15px;margin-bottom:4px}
        .neon-itemdesc{font-size:12.5px;color:var(--muted);line-height:1.6;max-width:440px}
        .neon-price{font-family:var(--mono);font-size:15px;white-space:nowrap}
        .neon-totals{display:flex;justify-content:flex-end;padding:26px 8px 0}
        .neon-totalsbox{min-width:300px}
        .neon-trow{display:flex;justify-content:space-between;font-family:var(--mono);font-size:13px;color:var(--muted);padding:6px 0}
        .neon-trow.grand{margin-top:12px;padding:16px 18px;border:1px solid var(--cyan-dim);border-radius:6px;background:linear-gradient(180deg, rgba(62,230,255,.06), rgba(62,230,255,.02));color:var(--text);font-size:20px;align-items:center}
        .neon-trow.grand b{color:var(--cyan);font-size:24px;text-shadow:0 0 24px rgba(62,230,255,.45)}
        .neon-trow.grand span{font-size:11px;letter-spacing:.22em}
        .neon-paywrap{display:flex;justify-content:flex-end;padding:18px 8px 0}
        .neon-paybtn{font-family:var(--mono);font-size:13px;letter-spacing:.22em;font-weight:700;color:#07080c;background:var(--cyan);border:none;border-radius:6px;padding:16px 34px;cursor:pointer;box-shadow:0 0 32px rgba(62,230,255,.45);transition:box-shadow .25s ease}
        .neon-paybtn:hover{box-shadow:0 0 48px rgba(62,230,255,.7)}
        .neon-terms{margin-top:40px;padding:24px;border:1px solid var(--line);border-radius:6px;background:var(--panel);font-size:12.5px;color:var(--muted);line-height:1.9}
        .neon-terms h4{font-family:var(--mono);font-size:10px;letter-spacing:.28em;color:var(--amber);margin-bottom:10px}
        .neon-foot{margin-top:36px;text-align:center;font-family:var(--mono);font-size:11px;letter-spacing:.26em;color:var(--muted)}
        .neon-foot span{color:var(--cyan)}
        @media (max-width:640px){
          .neon-head{flex-direction:column;gap:20px}
          .neon-meta{text-align:left}
          .neon-parties{flex-direction:column;gap:20px}
        }
        @media print{
          .neon-root{background:#fff;color:#111}
          .neon-px{animation:none;opacity:.3}
          .neon-paybtn{display:none}
        }
      `}</style>

      <div className="neon-sheet">
        <div className="neon-head">
          <div>
            <div className="neon-brand">
              {business?.brand_primary || 'INVOX'}<span>{business?.brand_accent || ''}</span>
              <small>{business?.tagline || ''}</small>
            </div>
          </div>
          <div className="neon-meta">
            <div className="neon-invtag">INVOICE № {invoice?.invoice_number}</div><br/>
            DATE ISSUED · <b>{invoice?.issue_date}</b><br/>
            VALID THROUGH · <b>{invoice?.due_date}</b><br/>
            {invoice?.project ? <>PROJECT · <b>{invoice.project}</b><br/></> : null}
          </div>
        </div>

        <div className="neon-wallwrap">
          <div className="neon-walllabel">{invoice?.hero_label || invoice?.project || 'INVOICE'}</div>
          <div className="neon-wall">
            {wallCells.map((d, i) => (
              <div key={i} className="neon-px" style={{ animationDelay: d + 's' }} />
            ))}
          </div>
        </div>

        <div className="neon-parties">
          <div>
            <h4>BILLED TO</h4>
            <b>{invoice?.client_name}</b><br/>
            {invoice?.client_address}
          </div>
          <div>
            <h4>FROM</h4>
            <b>{business?.name}</b><br/>
            {business?.address}<br/>
            {business?.website}
          </div>
        </div>

        <table className="neon-table">
          <thead>
            <tr><th>ITEM</th><th style={{ textAlign: 'right' }}>AMOUNT (USD)</th></tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div className="neon-itemname">{item.name}</div>
                  {item.description ? <div className="neon-itemdesc">{item.description}</div> : null}
                </td>
                <td className="neon-price">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="neon-totals">
          <div className="neon-totalsbox">
            <div className="neon-trow"><span>SUBTOTAL</span><span>{fmt(invoice?.subtotal)}</span></div>
            {invoice?.discount ? <div className="neon-trow"><span>DISCOUNT</span><span>−{fmt(invoice.discount)}</span></div> : null}
            {invoice?.deposit_paid ? <div className="neon-trow"><span>DEPOSIT RECEIVED</span><span>−{fmt(invoice.deposit_paid)}</span></div> : null}
            <div className="neon-trow grand"><span>TOTAL DUE</span><b>{fmt(invoice?.total)}</b></div>
          </div>
        </div>

        {invoice?.status !== 'paid' && (
          <div className="neon-paywrap">
            <button className="neon-paybtn" onClick={onPay}>PAY SECURELY →</button>
          </div>
        )}

        {invoice?.terms ? (
          <div className="neon-terms">
            <h4>TERMS &amp; SCHEDULE</h4>
            {invoice.terms}
          </div>
        ) : null}

        <div className="neon-foot">{business?.footer_line || business?.name}</div>
      </div>
    </div>
  );
}