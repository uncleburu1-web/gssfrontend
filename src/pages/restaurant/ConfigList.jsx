import { useState } from 'react';
import { apiErrorMessage } from '../../utils/format';

/**
 * One kind of restaurant set-up (areas, tables, stations, categories, choices…): a table of what
 * exists and a form to add or edit. Every change goes to the cloud API, which checks the branch,
 * the owner's rights and the package, and sends it to the hub till on its next pull.
 *
 * fields: [{ key, label, type: 'text'|'number'|'money'|'select'|'checkbox'|'time', options?, required?, hint?, placeholder? }]
 */
export default function ConfigList({ title, hint, rows, api, fields, columns, defaults = {}, onChanged, addLabel, toBody, extraActions, empty, noToggle, fromRow }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const body = {};
    for (const f of fields) {
      let v = form[f.key];
      if (f.type === 'number') v = v === '' || v === null || v === undefined ? null : Number(v);
      if ((f.type === 'select' || f.type === 'date') && v === '') v = null;
      body[f.key] = v;
    }
    try {
      const final = toBody ? toBody(body, form) : body;
      if (form.id) await api.update(form.id, final); else await api.create(final);
      setForm(null);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this.'));
    } finally {
      setBusy(false);
    }
  }

  async function run(fn, fallback) {
    setError('');
    try { await fn(); onChanged(); } catch (err) { setError(apiErrorMessage(err, fallback)); }
  }

  const set = (k, type) => (e) => setForm({ ...form, [k]: type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="section">
      <div className="section-head">
        <div><h3>{title}</h3>{hint && <div className="field-hint" style={{ marginTop: 3 }}>{hint}</div>}</div>
        <button className="btn small" onClick={() => { setError(''); setForm({ ...Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? false : ''])), ...defaults }); }}>
          {addLabel || '+ Add'}
        </button>
      </div>
      <div className="section-body">
        {error && !form && <div className="form-error">{error}</div>}
        {rows === null ? <div className="empty">Loading…</div> : rows.length === 0 ? <div className="empty">{empty || 'Nothing yet.'}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={r.is_active === false ? { opacity: 0.55 } : undefined}>
                    {columns.map((c) => <td key={c.label} className={c.num ? 'num' : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}
                    <td>{r.is_active === false ? <span className="badge muted">Off</span> : <span className="badge good">On</span>}</td>
                    <td className="row-actions">
                      {extraActions && extraActions(r)}
                      <button className="btn ghost small" onClick={() => { setError(''); setForm(fromRow ? fromRow(r) : { ...r }); }}>Edit</button>
                      {'is_active' in r && !noToggle && (
                        <button className="btn ghost small" onClick={() => run(() => api.update(r.id, { is_active: !r.is_active }), 'Could not change it.')}>
                          {r.is_active ? 'Switch off' : 'Switch on'}
                        </button>
                      )}
                      <button className="btn ghost small" onClick={() => { if (confirm('Delete this? Orders already taken keep their copy.')) run(() => api.remove(r.id), 'Could not delete it.'); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>{form.id ? `Edit ${title.toLowerCase().replace(/s$/, '')}` : addLabel ? addLabel.replace(/^\+\s*/, '') : `New ${title.toLowerCase().replace(/s$/, '')}`}</h3>
            <form onSubmit={save}>
              {error && <div className="form-error">{error}</div>}
              {fields.map((f) => (
                <div className="field" key={f.key}>
                  {f.type === 'checkbox' ? (
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', fontSize: 13, color: 'var(--text)', letterSpacing: 0 }}>
                      <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(form[f.key])} onChange={set(f.key, 'checkbox')} /> {f.label}
                    </label>
                  ) : (
                    <>
                      <label>{f.label}</label>
                      {f.type === 'select' ? (
                        <select value={form[f.key] ?? ''} onChange={set(f.key)} required={f.required} aria-label={f.label}>
                          {!f.required && <option value="">{f.none || '—'}</option>}
                          {f.required && !form[f.key] && <option value="">Choose…</option>}
                          {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input aria-label={f.label} type={f.type === 'money' || f.type === 'number' ? 'number' : f.type === 'time' || f.type === 'date' ? f.type : 'text'}
                          step={f.type === 'money' ? '0.01' : f.step || undefined} min={f.min} max={f.max}
                          required={f.required} value={form[f.key] ?? ''} onChange={set(f.key)} placeholder={f.placeholder} />
                      )}
                    </>
                  )}
                  {f.hint && <div className="field-hint">{f.hint}</div>}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
