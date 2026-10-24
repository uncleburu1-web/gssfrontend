import { useEffect, useState } from 'react';
import { restaurant } from '../../api/endpoints';
import { apiErrorMessage } from '../../utils/format';
import ConfigList from './ConfigList';
import { useLists } from './useLists';

const SERVICE_TYPES = [['dine_in', 'Dine-in'], ['takeaway', 'Takeaway'], ['counter', 'Counter']];
const STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];

/**
 * Service charge and taxes (owner's decision 4; gss docs/restaurant/REQUIREMENTS.md §4). Taxes are
 * created switched off and only start being charged through the activation step, which records the
 * state, the VAT registration and that the treatment was checked; two taxes that would both apply to
 * the same items are refused unless the owner confirms both legally apply. Every bill keeps its own
 * copy of what applied, and an order keeps the rates it was opened with.
 */
export default function TaxesTab() {
  const [{ taxRules }, reload, error] = useLists(['taxRules']);
  const [activating, setActivating] = useState(null);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ChargesForm />
      <div className="section" style={{ borderColor: 'var(--warn)' }}>
        <div className="section-body" style={{ paddingTop: 14, fontSize: 13, lineHeight: 1.55, color: 'var(--text-dim)' }}>
          <b style={{ color: 'var(--text)' }}>Before charging any tax, check with your accountant.</b> As of October 2026: VAT is 7.5% (Nigeria Tax Act 2025,
          from 1 January 2026), and small businesses with turnover of ₦100 million or less do not charge it. Lagos State charges a 5% Hotel Occupancy and Restaurant
          Consumption Tax on the bill excluding VAT. Whether states may also collect consumption taxes alongside VAT is still before the courts. Benchline never
          adds two taxes on the same items without you confirming both apply.
        </div>
      </div>
      <ConfigList title="Taxes" rows={taxRules} api={restaurant.taxRules} onChanged={reload} addLabel="+ Add tax" noToggle
        hint="A new tax is OFF until you activate it. Once active, its rate and coverage cannot be edited: switch it off and add a new one with a start date, so the record of what applied when stays true."
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. VAT, Lagos consumption tax' },
          { key: 'rate', label: 'Rate (%)', type: 'number', step: '0.0001', min: 0, max: 100, required: true },
          { key: 'inclusive', label: 'Menu prices already include this tax', type: 'checkbox' },
          { key: 'tax_classes', label: 'Covers tax classes (empty = every item)', placeholder: 'e.g. food, drink' },
          { key: 'applies_to_service_charge', label: 'Also charged on the service charge', type: 'checkbox' },
          { key: 'valid_from', label: 'From', type: 'date', required: true },
          { key: 'valid_to', label: 'Until (optional)', type: 'date' },
        ]}
        defaults={{ valid_from: new Date().toISOString().slice(0, 10), inclusive: false, applies_to_service_charge: false, tax_classes: '' }}
        fromRow={(r) => ({ ...r, tax_classes: (r.tax_classes || []).join(', '), valid_to: r.valid_to || '' })}
        toBody={(b) => ({ ...b, tax_classes: String(b.tax_classes || '').split(',').map((x) => x.trim()).filter(Boolean) })}
        columns={[
          { label: 'Tax', key: 'name' }, { label: 'Rate', render: (r) => `${Number(r.rate)}%${r.inclusive ? ' (in prices)' : ''}`, num: true },
          { label: 'Covers', render: (r) => (r.tax_classes || []).join(', ') || 'Every item' },
          { label: 'Dates', render: (r) => `${r.valid_from} → ${r.valid_to || 'onwards'}` },
        ]}
        extraActions={(r) => (r.is_active
          ? <button className="btn ghost small" onClick={async () => { await restaurant.taxRules.update(r.id, { is_active: false }).catch(() => {}); reload(); }}>Switch off</button>
          : <button className="btn small" onClick={() => setActivating(r)}>Activate</button>)} />
      {activating && <Activate rule={activating} onClose={() => setActivating(null)} onDone={() => { setActivating(null); reload(); }} />}
    </div>
  );
}

function ChargesForm() {
  const [form, setForm] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    // Load once; a late answer (React runs effects twice in development, or a slow network) must
    // never overwrite what the owner is already typing.
    let stale = false;
    restaurant.settings().then(({ data }) => { if (!stale) setForm((f) => f || data); })
      .catch((err) => { if (!stale) setError(apiErrorMessage(err, 'Could not load the settings.')); });
    return () => { stale = true; };
  }, []);
  if (!form) return error ? <div className="form-error">{error}</div> : null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggleType = (t) => setForm({ ...form, service_charge_types: form.service_charge_types.includes(t) ? form.service_charge_types.filter((x) => x !== t) : [...form.service_charge_types, t] });
  async function save(e) {
    e.preventDefault();
    setError(''); setNote('');
    try {
      const { data } = await restaurant.saveSettings({
        service_charge_rate: form.service_charge_rate, service_charge_types: form.service_charge_types,
        require_served_before_payment: form.require_served_before_payment, order_number_prefix: form.order_number_prefix,
        business_day_starts_at: form.business_day_starts_at,
      });
      setForm(data);
      setNote('Saved. Orders opened from now on use it; open orders keep what they started with.');
    } catch (err) { setError(apiErrorMessage(err, 'Could not save.')); }
  }
  return (
    <div className="section">
      <div className="section-head"><h3>Service charge and orders</h3></div>
      <div className="section-body">
        <form onSubmit={save}>
          {error && <div className="form-error">{error}</div>}
          {note && <div className="field-hint" style={{ color: 'var(--good)', marginBottom: 10 }}>{note}</div>}
          <div className="field-row">
            <div className="field"><label>Service charge (%)</label><input aria-label="Service charge" type="number" step="0.01" min="0" max="100" value={form.service_charge_rate} onChange={set('service_charge_rate')} /></div>
            <div className="field">
              <label>Charged on</label>
              <div style={{ display: 'flex', gap: 14, paddingTop: 8 }}>
                {SERVICE_TYPES.map(([t, l]) => (
                  <label key={t} style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', fontSize: 13, color: 'var(--text)', letterSpacing: 0, margin: 0 }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={form.service_charge_types.includes(t)} onChange={() => toggleType(t)} /> {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Order number prefix</label><input value={form.order_number_prefix} onChange={set('order_number_prefix')} placeholder="e.g. K-" maxLength={10} /></div>
            <div className="field"><label>Business day starts at</label><input type="time" value={(form.business_day_starts_at || '05:00').slice(0, 5)} onChange={set('business_day_starts_at')} />
              <div className="field-hint">Orders before this time count for the day before (late nights).</div></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', fontSize: 13, color: 'var(--text)', letterSpacing: 0 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(form.require_served_before_payment)} onChange={set('require_served_before_payment')} />
            Everything must be served before payment (a manager can override)
          </label>
          {form.tax_state && <div className="field-hint" style={{ marginTop: 10 }}>Taxes confirmed for {form.tax_state}, {form.vat_registered ? 'VAT-registered' : 'not VAT-registered'}, on {new Date(form.tax_treatment_confirmed_at).toLocaleDateString('en-GB')}.</div>}
          <div className="modal-actions"><button className="btn">Save</button></div>
        </form>
      </div>
    </div>
  );
}

function Activate({ rule, onClose, onDone }) {
  const [state, setState] = useState('');
  const [vat, setVat] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [overlap, setOverlap] = useState(null);
  const [overlapOk, setOverlapOk] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setError('');
    try {
      await restaurant.activateTaxes({ rule_ids: [rule.id], state, vat_registered: vat, treatment_confirmed: confirmed, overlap_confirmed: overlap ? overlapOk : undefined });
      onDone();
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.code === 'overlapping_taxes') setOverlap(err.response.data.detail);
      else setError(apiErrorMessage(err, 'Could not activate the tax.'));
    } finally { setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h3>Activate {rule.name} {Number(rule.rate)}%</h3>
        {error && <div className="form-error">{error}</div>}
        <div className="field"><label>State this branch is in</label>
          <select aria-label="State" value={state} onChange={(e) => setState(e.target.value)}><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label>Is the business registered for VAT?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn small ${vat === true ? '' : 'ghost'}`} onClick={() => setVat(true)}>Yes</button>
            <button type="button" className={`btn small ${vat === false ? '' : 'ghost'}`} onClick={() => setVat(false)}>No</button>
          </div></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', textTransform: 'none', fontSize: 13, color: 'var(--text)', letterSpacing: 0 }}>
          <input type="checkbox" style={{ width: 'auto', marginTop: 2 }} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I checked (with my accountant) that this branch must charge this tax at this rate. It is recorded with my name.
        </label>
        {overlap && (
          <div className="form-error" style={{ marginTop: 12 }}>
            {overlap}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', fontSize: 13, letterSpacing: 0, marginTop: 8, color: 'inherit' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={overlapOk} onChange={(e) => setOverlapOk(e.target.checked)} /> Both legally apply here
            </label>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || !state || vat === null || !confirmed || (overlap && !overlapOk)} onClick={go}>Start charging it</button>
        </div>
      </div>
    </div>
  );
}
