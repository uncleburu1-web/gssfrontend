import { useMemo, useRef, useState } from 'react';
import { sales } from '../api/endpoints';
import { newIdempotencyKey } from '../api/idempotency.js';
import { money, apiErrorMessage, PAYMENT_METHODS, methodLabel } from '../utils/format';

/**
 * Take items back on a completed sale: how many of each line, whether they can be sold again or are
 * damaged (written off), how the money goes back and why. The refund defaults to what those items
 * were sold for (after their share of any discount) and can only be lowered.
 */
export default function ReturnModal({ sale, onClose, onDone }) {
  const [qty, setQty] = useState({});
  const [damaged, setDamaged] = useState({});
  const [method, setMethod] = useState(sale.payment_method || 'cash');
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey()); // a double-tap or retried request refunds once

  const returned = sale.returned_quantities || {};
  const left = (i) => i.quantity - (returned[i.id] || 0);
  const value = useMemo(() => Math.round(sale.items.reduce(
    (t, i) => t + (Number(qty[i.id]) || 0) * (Number(i.total ?? i.unit_price * i.quantity - (i.discount || 0)) / i.quantity), 0,
  ) * 100) / 100, [sale, qty]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const lines = sale.items.filter((i) => Number(qty[i.id]) > 0)
      .map((i) => ({ sale_item: i.id, quantity: Number(qty[i.id]), restock: !damaged[i.id] }));
    setBusy(true); setError('');
    try {
      const { data } = await sales.takeReturn(sale.id, {
        lines, reason, refund_method: method, ...(refund === '' ? {} : { refund_amount: refund }),
      }, { headers: { 'Idempotency-Key': key.current } });
      onDone(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not record the return.'));
      key.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>Return items — {sale.receipt_no || `#${sale.invoice_number}`}</h3>
        <form onSubmit={submit}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Item</th><th>Sold</th><th>Return</th><th>Damaged?</th></tr></thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.item_name}</td>
                    <td className="num">{i.quantity}{left(i) < i.quantity ? ` (${i.quantity - left(i)} back)` : ''}</td>
                    <td><input type="number" min="0" max={left(i)} step={i.sold_by_weight ? '0.001' : '1'} style={{ width: 70 }} disabled={left(i) <= 0}
                      value={qty[i.id] ?? ''} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" title="Damaged: write it off instead of putting it back in stock"
                        checked={Boolean(damaged[i.id])} onChange={(e) => setDamaged({ ...damaged, [i.id]: e.target.checked })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="field">
            <label>Refund by</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Refund (₦) — up to {money(value)}</label>
            <input type="number" min="0" max={value} step="0.01" placeholder={String(value)} value={refund} onChange={(e) => setRefund(e.target.value)} />
          </div>
          <div className="field">
            <label>Reason (required)</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size, customer changed mind" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={busy || value <= 0 || !reason.trim()}>
              {busy ? 'Saving…' : `Refund ${money(refund === '' ? value : Number(refund))}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
