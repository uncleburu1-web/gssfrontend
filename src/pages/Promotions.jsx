import { useEffect, useState } from 'react';
import { inventory, promotions as promotionsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { money, fmtDateTime, apiErrorMessage } from '../utils/format';

const KIND_LABEL = { percent_off: '% off', amount_off: 'Amount off each', buy_x_get_y: 'Buy X get Y free' };
const empty = { name: '', kind: 'percent_off', value: '', applies_to: 'item', item: '', category: '', min_quantity: 1,
  buy_quantity: 2, get_quantity: 1, starts_at: '', ends_at: '' };

function describe(p) {
  const on = p.applies_to === 'all' ? 'everything' : p.applies_to === 'category' ? `category ${p.category}` : p.item_name || 'a product';
  if (p.kind === 'buy_x_get_y') return `Buy ${p.buy_quantity}, get ${p.get_quantity} free — ${on}`;
  const min = p.min_quantity > 1 ? ` when buying ${p.min_quantity}+` : '';
  return p.kind === 'percent_off' ? `${Number(p.value)}% off ${on}${min}` : `${money(p.value)} off each — ${on}${min}`;
}

/**
 * Promotions are rules the owner sets once; every till downloads them and applies them at checkout
 * (offline too), and so do the web and Android apps. The customer always gets the single best one.
 */
export default function Promotions() {
  const { isOwner, availableCategories } = useAuth();
  const [rows, setRows] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    promotionsApi.list().then(({ data }) => setRows(data.results || data)).catch((err) => { setRows([]); setError(apiErrorMessage(err, 'Could not load promotions.')); });
  }
  useEffect(() => {
    load();
    inventory.list({ page_size: 1000 }).then(({ data }) => setItems(data.results || data)).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const body = {
      name: form.name, kind: form.kind, applies_to: form.kind === 'buy_x_get_y' ? 'item' : form.applies_to,
      value: form.kind === 'buy_x_get_y' ? 0 : form.value,
      item: form.applies_to === 'item' || form.kind === 'buy_x_get_y' ? form.item || null : null,
      category: form.applies_to === 'category' ? form.category : '',
      min_quantity: Number(form.min_quantity) || 1,
      buy_quantity: form.kind === 'buy_x_get_y' ? Number(form.buy_quantity) : null,
      get_quantity: form.kind === 'buy_x_get_y' ? Number(form.get_quantity) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    try {
      if (form.id) await promotionsApi.update(form.id, body); else await promotionsApi.create(body);
      setForm(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this promotion.'));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p) {
    await promotionsApi.update(p.id, { is_active: !p.is_active }).catch((err) => setError(apiErrorMessage(err, 'Could not change it.')));
    load();
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"? Sales already made keep their discount.`)) return;
    await promotionsApi.remove(p.id).catch((err) => setError(apiErrorMessage(err, 'Could not delete it.')));
    load();
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Promotions</div>
          <div className="page-sub">Discount rules every till applies at checkout — offline too. The customer gets the single best one.</div>
        </div>
        {isOwner && <button className="btn" onClick={() => { setError(''); setForm({ ...empty }); }}>+ New promotion</button>}
      </div>

      <div className="section">
        <div className="section-body">
          {error && !form && <div className="form-error">{error}</div>}
          {rows === null ? <div className="empty">Loading…</div> : rows.length === 0 ? (
            <div className="empty">No promotions yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Name</th><th>Rule</th><th>Runs</th><th>Used</th><th>Given away</th><th>Status</th>{isOwner && <th></th>}</tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{describe(p)}</td>
                      <td style={{ fontSize: 12 }}>{p.starts_at ? fmtDateTime(p.starts_at) : 'Now'} → {p.ends_at ? fmtDateTime(p.ends_at) : 'until stopped'}</td>
                      <td className="num">{p.times_used}</td>
                      <td className="num">{money(p.discount_given)}</td>
                      <td>{p.is_active ? <span className="badge good">On</span> : <span className="badge muted">Stopped</span>}</td>
                      {isOwner && (
                        <td className="row-actions">
                          <button className="btn ghost small" onClick={() => setForm({ ...empty, ...p, item: p.item || '', value: p.value, starts_at: p.starts_at ? p.starts_at.slice(0, 16) : '', ends_at: p.ends_at ? p.ends_at.slice(0, 16) : '' })}>Edit</button>
                          <button className="btn ghost small" onClick={() => toggle(p)}>{p.is_active ? 'Stop' : 'Start'}</button>
                          <button className="btn ghost small" onClick={() => remove(p)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>{form.id ? 'Edit promotion' : 'New promotion'}</h3>
            <form onSubmit={save}>
              <div className="field"><label>Name</label><input required value={form.name} onChange={set('name')} placeholder="e.g. Malt weekend 10% off" /></div>
              <div className="field">
                <label>Type</label>
                <select value={form.kind} onChange={set('kind')}>
                  {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              {form.kind === 'buy_x_get_y' ? (
                <div className="field-row">
                  <div className="field"><label>Buy</label><input type="number" min="1" required value={form.buy_quantity} onChange={set('buy_quantity')} /></div>
                  <div className="field"><label>Get free</label><input type="number" min="1" required value={form.get_quantity} onChange={set('get_quantity')} /></div>
                </div>
              ) : (
                <div className="field-row">
                  <div className="field">
                    <label>{form.kind === 'percent_off' ? 'Percent off' : 'Naira off each'}</label>
                    <input type="number" min="0.01" step="0.01" max={form.kind === 'percent_off' ? 100 : undefined} required value={form.value} onChange={set('value')} />
                  </div>
                  <div className="field"><label>When buying at least</label><input type="number" min="1" value={form.min_quantity} onChange={set('min_quantity')} /></div>
                </div>
              )}
              {form.kind !== 'buy_x_get_y' && (
                <div className="field">
                  <label>Applies to</label>
                  <select value={form.applies_to} onChange={set('applies_to')}>
                    <option value="item">One product</option>
                    <option value="category">A category</option>
                    <option value="all">Everything</option>
                  </select>
                </div>
              )}
              {(form.applies_to === 'item' || form.kind === 'buy_x_get_y') && (
                <div className="field">
                  <label>Product</label>
                  <select required value={form.item} onChange={set('item')}>
                    <option value="">Choose…</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
              )}
              {form.applies_to === 'category' && form.kind !== 'buy_x_get_y' && (
                <div className="field">
                  <label>Category</label>
                  <select required value={form.category} onChange={set('category')}>
                    <option value="">Choose…</option>
                    {(availableCategories || []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div className="field-row">
                <div className="field"><label>Starts (optional)</label><input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} /></div>
                <div className="field"><label>Ends (optional)</label><input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} /></div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
