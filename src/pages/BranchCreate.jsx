import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { branches as branchesApi, subscription } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/Icons';

function extractError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail[0];
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const v = data[firstKey];
  return Array.isArray(v) ? v[0] : String(v);
}

const EMPTY = {
  name: '', branch_code: '', address: '', phone: '', email: '', logo_url: '',
  opening_date: '', tax_rate_default: '0', description: '',
  manager_login_full_name: '', manager_login_username: '', manager_login_password: '', confirm_password: '',
};

export default function BranchCreate() {
  const { shopLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    subscription.status().then(({ data }) => setPricing(data)).catch(() => {});
  }, []);

  const additionalBranchCost = pricing && !pricing.is_enterprise ? pricing.pricing?.[pricing.billing_cycle]?.additional_branch : null;

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Give this branch a name.'); return; }
    if (form.manager_login_password && form.manager_login_password !== form.confirm_password) {
      setError('The manager\u2019s password and confirmation don\u2019t match.');
      return;
    }
    if (form.manager_login_username && !form.manager_login_password) {
      setError('Set a password for the branch manager\u2019s login.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name, branch_code: form.branch_code, address: form.address,
        phone: form.phone, email: form.email, logo_url: form.logo_url,
        opening_date: form.opening_date || null, tax_rate_default: form.tax_rate_default,
        description: form.description,
        manager_login_full_name: form.manager_login_full_name,
        manager_login_username: form.manager_login_username,
        manager_login_password: form.manager_login_password,
      };
      await branchesApi.create(payload);
      navigate('/app/settings');
    } catch (err) {
      setError(extractError(err, 'Could not create this branch — check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="branded-page">
      <Link to="/app/settings" className="branded-page-back">← Back to Settings</Link>

      <div className="branded-page-header">
        {shopLogoUrl ? (
          <img src={shopLogoUrl} alt="" className="branded-page-logo" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <img src="/logo.png" alt="" className="branded-page-logo" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <h1>Create a new branch</h1>
        <p>Set it up like a new shop — its own name, contact details, and a manager who logs in and only ever sees this branch.</p>
      </div>

      <div className="branded-card">
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-section-title">Branch details</div>

          <div className="field-row">
            <div className="field"><label>Branch name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Nwauka Drinks Depot" autoFocus />
            </div>
            <div className="field"><label>Branch code (optional)</label>
              <input value={form.branch_code} onChange={(e) => set('branch_code', e.target.value)} placeholder="e.g. NWK001" />
              <div className="field-hint">A short internal code — leave blank if you don't need one.</div>
            </div>
          </div>

          <div className="field"><label>Address</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area, city" />
          </div>

          <div className="field-row">
            <div className="field"><label>Phone (for receipts)</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 08012345678" />
            </div>
            <div className="field"><label>Email (for receipts)</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="branch@example.com" />
            </div>
          </div>

          <div className="field"><label>Branch logo URL (optional)</label>
            <input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…" />
            <div className="field-hint">A link to an already-hosted image — printed on this branch's receipts and shown once its manager logs in. Leave blank to use your main shop logo.</div>
            {form.logo_url && <img src={form.logo_url} alt="" className="logo-preview-circle" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />}
          </div>

          <div className="field-row">
            <div className="field"><label>Opening date</label>
              <input type="date" value={form.opening_date} onChange={(e) => set('opening_date', e.target.value)} />
            </div>
            <div className="field"><label>Default tax rate (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.tax_rate_default} onChange={(e) => set('tax_rate_default', e.target.value)} />
            </div>
          </div>

          <div className="field"><label>Notes</label>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="form-section-title">{Icons.lock} Branch manager login</div>
          <div className="field-hint" style={{ marginTop: -6, marginBottom: 14 }}>
            Give this branch a manager now, or leave these blank and assign one later from Settings.
          </div>

          <div className="field"><label>Manager's name</label>
            <input value={form.manager_login_full_name} onChange={(e) => set('manager_login_full_name', e.target.value)} placeholder="e.g. Ifeoma Nwauka" />
          </div>

          <div className="field-row">
            <div className="field"><label>Username</label>
              <input value={form.manager_login_username} onChange={(e) => set('manager_login_username', e.target.value)} autoComplete="off" placeholder="e.g. ifeoma.nwauka" />
            </div>
            <div className="field"><label>Password</label>
              <input type="password" value={form.manager_login_password} onChange={(e) => set('manager_login_password', e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
          </div>

          {form.manager_login_password && (
            <div className="field"><label>Confirm password</label>
              <input type="password" value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} autoComplete="new-password" />
            </div>
          )}

          <div className="field-hint">
            Once created, this manager logs in on the web app or Android and sees "{form.name || 'this branch'}" as their shop — only this branch's stock, sales, and reports.
          </div>

          {additionalBranchCost != null && (
            <div className="banner info" style={{ marginTop: 16 }}>
              Adding this branch adds ₦{additionalBranchCost.toLocaleString()}/month to your subscription — billed the same way as your other branches.
            </div>
          )}

          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 22 }} type="submit" disabled={saving}>
            {saving ? 'Creating branch…' : 'Create branch'}
          </button>
        </form>
      </div>
    </div>
  );
}
