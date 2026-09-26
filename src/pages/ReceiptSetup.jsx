import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { branches as branchesApi } from '../api/endpoints';
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

export default function ReceiptSetup() {
  const { user, shopId, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = !!location.state?.onboarding;

  const [name, setName] = useState(user?.shop_name || '');
  const [address, setAddress] = useState(user?.shop_address || '');
  const [phone, setPhone] = useState(user?.shop_phone || '');
  const [email, setEmail] = useState(user?.shop_email || '');
  const [logoUrl, setLogoUrl] = useState(user?.shop_logo_url || '');
  const [footerNote, setFooterNote] = useState(user?.shop_receipt_footer_note || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function goToDashboard() {
    navigate('/app');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Your shop needs a name — it prints at the top of every receipt.'); return; }
    setSaving(true);
    try {
      await branchesApi.update(shopId, {
        name, address, phone, email, logo_url: logoUrl, receipt_footer_note: footerNote,
      });
      await refreshUser();
      goToDashboard();
    } catch (err) {
      setError(extractError(err, 'Could not save your receipt details — check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="branded-page">
      {!onboarding && <Link to="/app/settings" className="branded-page-back">← Back to Settings</Link>}

      <div className="branded-page-header">
        <img src="/logo.png" alt="" className="branded-page-logo" onError={(e) => { e.target.style.display = 'none'; }} />
        <h1>{onboarding ? "Let's design your receipt" : 'Receipt settings'}</h1>
        <p>
          {onboarding
            ? "Almost there — this is what your customers see when you print a sale. We've filled in what you told us at signup; change anything you like."
            : "This is what prints at the top and bottom of every sale receipt, on both the web app and Android."}
        </p>
      </div>

      <div className="branded-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 28 }}>
        <div>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="form-section-title">Company details</div>
            <div className="field"><label>Shop name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chidi's Gadget Store" />
            </div>
            <div className="field"><label>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
            </div>
            <div className="field-row">
              <div className="field"><label>Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08012345678" />
              </div>
              <div className="field"><label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="shop@example.com" />
              </div>
            </div>
            <div className="field"><label>Logo URL</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
              <div className="field-hint">A link to an already-hosted image. Shows on the web/desktop receipt — thermal Android receipts are plain text, so it won't print there, only the name and address will.</div>
            </div>

            <div className="form-section-title">{Icons.edit} Receipt message</div>
            <div className="field"><label>Closing line</label>
              <input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="Thanks For Your Patronage" maxLength={200} />
              <div className="field-hint">Printed at the very bottom of every receipt — a thank-you note, a return policy, whatever you like. Leave blank to use the default shown in the preview.</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              {onboarding && (
                <button type="button" className="btn ghost" onClick={goToDashboard} disabled={saving}>Skip for now</button>
              )}
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} type="submit" disabled={saving}>
                {saving ? 'Saving…' : onboarding ? 'Save and go to my dashboard' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="form-section-title" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>Preview</div>
          <ReceiptPreview name={name} address={address} phone={phone} email={email} logoUrl={logoUrl} footerNote={footerNote} />
        </div>
      </div>
    </div>
  );
}

function ReceiptPreview({ name, address, phone, email, logoUrl, footerNote }) {
  return (
    <div style={{
      border: '2px solid #2c4a7c', borderRadius: 4, padding: '18px 16px', background: '#fff',
      color: '#1b2a4a', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 12,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        {logoUrl && (
          <img src={logoUrl} alt="" style={{ maxHeight: 40, maxWidth: 140, marginBottom: 6 }}
            onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />
        )}
        <div style={{ fontWeight: 'bold', fontSize: 17, letterSpacing: 1, color: '#2c4a7c' }}>{name || 'Your Shop Name'}</div>
      </div>
      <div style={{ fontSize: 10.5, lineHeight: 1.5, marginBottom: 10 }}>
        {address && <div>{address}</div>}
        {phone && <div>Tel: {phone}</div>}
        {email && <div>{email}</div>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, marginBottom: 8 }}>
        <thead>
          <tr style={{ background: '#2c4a7c', color: '#fff' }}>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'normal' }}>QTY</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'normal' }}>DESCRIPTION</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'normal' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '4px 6px' }}>1</td>
            <td style={{ padding: '4px 6px' }}>Sample item</td>
            <td style={{ padding: '4px 6px' }}>₦5,000</td>
          </tr>
          <tr style={{ fontWeight: 'bold', borderTop: '2px solid #2c4a7c' }}>
            <td colSpan={2} style={{ padding: '4px 6px', textAlign: 'right' }}>Total</td>
            <td style={{ padding: '4px 6px' }}>₦5,000</td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 11, marginTop: 10 }}>
        {footerNote || 'Thanks For Your Patronage'}
      </div>
    </div>
  );
}
