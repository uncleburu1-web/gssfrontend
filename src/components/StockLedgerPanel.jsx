import { useEffect, useState } from 'react';
import { inventory, stockMovements } from '../api/endpoints';
import { fmtDateTime, apiErrorMessage } from '../utils/format';

const KIND_LABEL = {
  opening: 'Opening balance', sale: 'Sale', sale_reversal: 'Sale reversed', receipt: 'Stock received',
  return: 'Customer return', adjustment: 'Count adjustment', damage: 'Damaged / written off',
  transfer: 'Transfer', repair_part: 'Used on service job', repair_part_return: 'Returned from service job',
};

/**
 * Record damage (anyone, reason required) or a stock count (owners), and show the item's stock
 * ledger: every change, who made it and why. Sellers see only the changes they made themselves.
 */
export default function StockLedgerPanel({ item, detail, isOwner, onChanged }) {
  const [mode, setMode] = useState(null); // 'damage' | 'count' | null
  const [form, setForm] = useState({ quantity: '', reason: '', variant: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(null);

  const variants = detail?.variants || [];

  function loadHistory() {
    stockMovements.list({ item: item.id })
      .then(({ data }) => setRows(data.results || data))
      .catch(() => setRows([]));
  }
  useEffect(loadHistory, [item.id]);

  function open(next) {
    setError('');
    setForm({ quantity: next === 'count' ? String(item.quantity ?? '') : '', reason: '', variant: variants[0]?.id || '' });
    setMode(next);
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const variant = variants.length ? form.variant : undefined;
    try {
      if (mode === 'damage') {
        await inventory.recordDamage(item.id, { quantity: form.quantity, reason: form.reason, variant });
      } else {
        await inventory.stockCount(item.id, { counted_quantity: form.quantity, reason: form.reason, variant });
      }
      setMode(null);
      loadHistory();
      onChanged?.();
    } catch (err) {
      setError(apiErrorMessage(err, mode === 'damage' ? 'Could not record the damage.' : 'Could not save the count.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="stock-card-detail-head">
        <span>Stock changes</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn small ghost" onClick={() => open('damage')} disabled={!item.quantity}>Record damage</button>
          {isOwner && <button className="btn small ghost" onClick={() => open('count')}>Stock count</button>}
        </div>
      </div>
      {rows === null ? (
        <div className="empty">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty">No stock changes{isOwner ? '' : ' recorded by you'} yet.</div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>When</th><th>What</th><th>Qty</th><th>Who</th><th>Reason</th></tr></thead>
            <tbody>
              {rows.map((m) => {
                const qty = Number(m.quantity);
                return (
                  <tr key={m.id}>
                    <td className="mono">{fmtDateTime(m.created_at)}</td>
                    <td>{KIND_LABEL[m.kind] || m.kind_label || m.kind}{m.variant_label ? ` · ${m.variant_label}` : ''}</td>
                    <td className="num" style={{ color: qty < 0 ? 'var(--danger)' : undefined }}>{qty > 0 ? `+${qty}` : qty}</td>
                    <td>{m.actor_name || '—'}{m.source === 'till' ? ' (till)' : ''}</td>
                    <td>
                      {m.reason}
                      {m.counted_quantity != null && ` (system ${Number(m.system_quantity)}, counted ${Number(m.counted_quantity)})`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mode && (
        <div className="modal-backdrop" onClick={() => setMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{mode === 'damage' ? 'Record damage' : 'Stock count'} — {item.name}</h3>
            <p className="page-sub" style={{ marginTop: 0 }}>
              {mode === 'damage'
                ? `In stock: ${item.quantity}. Damaged, expired or missing stock comes off now; your name and reason are recorded.`
                : `The system says ${item.quantity}. Enter what is physically there; the difference is recorded with your name and reason.`}
            </p>
            <form onSubmit={submit}>
              {error && <div className="form-error">{error}</div>}
              {variants.length > 0 && (
                <div className="field">
                  <label>Variant</label>
                  <select value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })}>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.quantity})</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label>{mode === 'damage' ? 'Quantity damaged' : 'Counted quantity'}</label>
                <input required autoFocus type="number" min={mode === 'damage' ? (item.sold_by_weight ? 0.001 : 1) : 0} step={item.sold_by_weight ? '0.001' : '1'} value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="field">
                <label>Reason (required)</label>
                <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={mode === 'damage' ? 'e.g. Cartons soaked in the rain' : 'e.g. Month-end count'} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setMode(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={saving || !form.reason.trim()}>
                  {saving ? 'Saving…' : mode === 'damage' ? 'Write off' : 'Save count'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
