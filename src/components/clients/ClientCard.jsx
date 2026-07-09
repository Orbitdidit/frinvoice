import React from 'react';
import { Mail, Phone, Building2, Edit, Trash2, FileText } from 'lucide-react';

function getPaymentTermLabel(term) {
  const map = { net_15: 'Net 15', net_30: 'Net 30', net_45: 'Net 45', due_on_receipt: 'Due on Receipt' };
  return map[term] || term || 'Net 30';
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function ClientCard({ client, onEdit, onDelete }) {
  return (
    <div
      className="group rounded-md border-2 border-ink shadow-hard hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-hard-lg transition-all"
      style={{ background: 'var(--cream)' }}
    >
      {/* Header bar */}
      <div className="flex items-start justify-between gap-2 bg-ink px-4 py-3 rounded-t-[4px]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Initials avatar block */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center font-heading font-extrabold text-sm text-ink"
            style={{ background: 'var(--sand)', border: '2px solid #17150f' }}
          >
            {getInitials(client.name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-extrabold text-lg text-paper truncate leading-tight">{client.name}</h3>
            {client.company && (
              <p className="text-xs font-mono text-paper/70 flex items-center gap-1 truncate mt-0.5">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(client)}
            className="p-1.5 rounded text-paper/70 hover:text-paper hover:bg-white/10 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client.id)}
            className="p-1.5 rounded text-paper/70 hover:text-red hover:bg-white/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Contact info */}
        <div className="space-y-1.5 mb-4">
          {client.email && (
            <div className="flex items-center gap-2 text-sm font-mono text-ink">
              <Mail className="w-3.5 h-3.5 text-ink-soft flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm font-mono text-ink">
              <Phone className="w-3.5 h-3.5 text-ink-soft flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          {!client.email && !client.phone && (
            <p className="text-sm font-mono text-ink-soft">No contact info</p>
          )}
        </div>

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-ink/10">
          <div className="flex items-center gap-1.5 text-xs font-mono text-ink-soft">
            <FileText className="w-3.5 h-3.5" />
            {client.total_invoices || 0} invoice{(client.total_invoices || 0) !== 1 ? 's' : ''}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">Revenue</p>
            <p className="font-amount text-base text-money">${(client.total_revenue || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-2">
          <span className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wide px-2 py-0.5 rounded border border-ink text-ink">
            {getPaymentTermLabel(client.payment_terms)}
          </span>
        </div>
      </div>
    </div>
  );
}