import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi, branches as branchesApi, devices as devicesApi, subscription as subscriptionApi, controlCenter as controlCenterApi } from '../api/endpoints';
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

const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended', archived: 'Archived' };

// Every Worker.ROLE_CHOICES label the frontend needs to show somewhere in
// Settings — the Account card's own role line, and the Control Center's
// column headers below. Deliberately includes 'owner'/'branch_manager'
// too (for AccountSection) even though neither is configurable in the
// Control Center itself — see core.capabilities.CONFIGURABLE_ROLES on the
// backend, which is the actual list ControlCenterSection renders columns
// for.
const STAFF_ROLE_LABEL = {
  owner: 'Owner', branch_manager: 'Branch manager', seller: 'Seller',
  reception: 'Receptionist', technician: 'Service technician',
  attendant: 'Shop attendant', other: 'Other',
};

const ANDROID_APK_URL = 'https://github.com/uncleburu1-web/gssandriod/releases/latest/download/gss-android.apk';
const DESKTOP_EXE_URL = 'https://github.com/uncleburu1-web/gssdesktop/releases/latest/download/GSS-Setup.exe';

export default function Settings() {
  const { user, logout, isCeo, shopName } = useAuth();

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Your account, {isCeo ? 'branches, and paired devices' : 'and paired devices'}.</div>
        </div>
      </div>

      <AccountSection user={user} shopName={shopName} logout={logout} />
      <AppDownloadsSection />
      {isCeo && <ReceiptSection />}
      {isCeo && <BranchesSection />}
      {isCeo && <ControlCenterSection />}
      <DevicesSection />
    </div>
  );
}

function AppDownloadsSection() {
  function download(label, url) {
    if (window.confirm(`Are you sure you want to install ${label}?`)) {
      window.location.href = url;
    }
  }

  return (
    <div className="section">
      <div className="section-head"><h3>Get the app</h3></div>
      <div className="section-body">
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Run GSS as its own app instead of a browser tab — the desktop app keeps ringing up
          sales even when the internet drops, and the Android app fits in your pocket.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn small" onClick={() => download('the Android app', ANDROID_APK_URL)}>
            {Icons.device} Download for Android
          </button>
          <button className="btn small" onClick={() => download('the desktop app', DESKTOP_EXE_URL)}>
            {Icons.device} Download for Windows
          </button>
        </div>
        <div className="field-hint" style={{ marginTop: 10 }}>
          Android will warn about installing from outside the Play Store — that's expected for
          a direct download; allow it for this file. Both always link to the newest version.
        </div>
      </div>
    </div>
  );
}

function ReceiptSection() {
  return (
    <div className="section">
      <div className="section-head"><h3>Receipt</h3></div>
      <div className="section-body">
        <div className="field-hint" style={{ marginBottom: 10 }}>
          Your shop's name, address, logo, and closing message — what prints on every sale receipt.
        </div>
        <Link to="/app/receipt-setup" className="btn small">{Icons.edit} Edit receipt details</Link>
      </div>
    </div>
  );
}

function AccountSection({ user, shopName, logout }) {
  return (
    <div className="section">
      <div className="section-head"><h3>Account</h3></div>
      <div className="section-body">
        <div className="field-row">
          <div className="field"><label>Name</label><div className="static-value">{user?.full_name || user?.username}</div></div>
          <div className="field"><label>Username</label><div className="static-value">{user?.username}</div></div>
          <div className="field"><label>Role</label><div className="static-value">{STAFF_ROLE_LABEL[user?.role] || (user?.is_owner ? 'Owner' : 'Seller')}</div></div>
          <div className="field"><label>Shop</label><div className="static-value">{shopName}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn danger small" onClick={logout}>
            {Icons.logout} Log out
          </button>
        </div>
        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New password and confirmation don\u2019t match.'); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess('Password updated.');
      reset();
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(extractError(err, 'Could not update your password.'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => { setOpen(true); setSuccess(''); }}>
        {Icons.lock} Change password
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', maxWidth: 360 }}>
      <div className="form-section-title" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>{Icons.lock} Change password</div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="banner good" style={{ marginBottom: 12 }}>{success}</div>}
      <div className="field"><label>Current password</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <div className="field"><label>New password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
        <div className="field-hint">At least 8 characters.</div>
      </div>
      <div className="field"><label>Confirm new password</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn ghost small" onClick={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</button>
        <button type="submit" className="btn small" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
      </div>
    </form>
  );
}

function BranchesSection() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');
  const [modalBranch, setModalBranch] = useState(null); // null = closed, {...} = editing

  function load() {
    branchesApi.list().then(({ data }) => setList(data.results || data)).catch((err) => setError(extractError(err, 'Could not load branches.')));
    subscriptionApi.status().then(({ data }) => setSub(data)).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function archiveOrRestore(branch) {
    const next = branch.status === 'archived' ? 'active' : 'archived';
    if (next === 'archived' && !window.confirm(`Archive ${branch.name}? It stops appearing for day-to-day use, but its sales history stays intact.`)) return;
    try {
      await branchesApi.update(branch.id, { status: next });
      load();
    } catch (err) {
      setError(extractError(err, 'Could not update this branch.'));
    }
  }

  function handleCreateClick(e) {
    // A trial org already has the one branch signup created for them —
    // adding another is a paid-plan feature (see Subscription.total_price_ngn:
    // every branch past the first is a billed add-on). Rather than hide the
    // button, it's always there and just routes to plan selection first if
    // they're not actually paying yet.
    if (sub && sub.effective_status === 'trial') {
      e.preventDefault();
      navigate('/app/billing');
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <h3>Branches</h3>
        <Link to="/app/branches/new" className="btn small" onClick={handleCreateClick}>{Icons.plus} Create branch</Link>
      </div>
      <div className="section-body">
        {error && <div className="form-error">{error}</div>}
        {!list ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No branches yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>Phone</th><th>Manager</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.logo_url && <img src={b.logo_url} alt="" className="branch-logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                      {b.name}
                    </div>
                  </td>
                  <td className="mono">{b.branch_code || '—'}</td>
                  <td>{b.phone || '—'}</td>
                  <td>{b.manager_name || <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}</td>
                  <td><span className={`badge ${b.status === 'active' ? 'good' : b.status === 'archived' ? 'muted' : 'warn'}`}>{STATUS_LABELS[b.status]}</span></td>
                  <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn ghost small" onClick={() => setModalBranch(b)}>{Icons.edit} Edit</button>
                    <button className="btn ghost small" onClick={() => archiveOrRestore(b)}>
                      {b.status === 'archived' ? 'Restore' : 'Archive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalBranch && (
        <BranchModal
          branch={modalBranch}
          onClose={() => setModalBranch(null)}
          onSaved={() => { setModalBranch(null); load(); }}
        />
      )}
    </div>
  );
}

function BranchModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: branch.name || '', branch_code: branch.branch_code || '', address: branch.address || '',
    phone: branch.phone || '', email: branch.email || '', logo_url: branch.logo_url || '',
    opening_date: branch.opening_date || '', tax_rate_default: branch.tax_rate_default ?? '0',
    description: branch.description || '',
    manager_login_full_name: '', manager_login_username: '', manager_login_password: '', confirm_password: '',
  });
  const [showManagerFields, setShowManagerFields] = useState(!branch.manager_name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  const hasManagerLogin = !!branch.manager_username;

  async function save() {
    setError('');
    if (!form.name.trim()) { setError('Give this branch a name.'); return; }
    if (form.manager_login_password && form.manager_login_password !== form.confirm_password) {
      setError('The manager\u2019s password and confirmation don\u2019t match.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, opening_date: form.opening_date || null };
      delete payload.confirm_password;
      await branchesApi.update(branch.id, payload);
      onSaved();
    } catch (err) {
      setError(extractError(err, 'Could not save this branch — check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit {branch.name}</h3>
        {error && <div className="form-error">{error}</div>}

        <div className="field-row">
          <div className="field"><label>Branch name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Wuse II" />
          </div>
          <div className="field"><label>Branch code</label>
            <input value={form.branch_code} onChange={(e) => set('branch_code', e.target.value)} placeholder="e.g. WUSE001" />
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
            <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="shop@example.com" />
          </div>
        </div>

        <div className="field"><label>Logo URL</label>
          <input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…" />
          <div className="field-hint">A link to an already-hosted image — printed on receipts and shown in the desktop app. Leave blank for none.</div>
          {form.logo_url && <img src={form.logo_url} alt="" className="branch-logo-preview" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />}
        </div>

        <div className="field-row">
          <div className="field"><label>Opening date</label>
            <input type="date" value={form.opening_date || ''} onChange={(e) => set('opening_date', e.target.value)} />
          </div>
          <div className="field"><label>Default tax rate (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={form.tax_rate_default} onChange={(e) => set('tax_rate_default', e.target.value)} />
          </div>
        </div>

        <div className="field"><label>Notes</label>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="form-section-title">{Icons.lock} Branch manager</div>

        {branch.manager_name && (
          <div className="field-hint" style={{ marginBottom: 10 }}>
            Currently {branch.manager_name}{hasManagerLogin ? ` (logs in as "${branch.manager_username}")` : ' — no login set up yet'}.
          </div>
        )}

        {!showManagerFields ? (
          <button type="button" className="btn ghost small" onClick={() => setShowManagerFields(true)}>
            {hasManagerLogin ? 'Reset manager password' : 'Set up a login for this manager'}
          </button>
        ) : (
          <>
            {!branch.manager_name && (
              <div className="field"><label>Manager's name</label>
                <input value={form.manager_login_full_name} onChange={(e) => set('manager_login_full_name', e.target.value)} placeholder="e.g. Ifeoma Nwauka" />
              </div>
            )}
            <div className="field-row">
              {!hasManagerLogin && (
                <div className="field"><label>Username</label>
                  <input value={form.manager_login_username} onChange={(e) => set('manager_login_username', e.target.value)} autoComplete="off" />
                </div>
              )}
              <div className="field"><label>{hasManagerLogin ? 'New password' : 'Password'}</label>
                <input type="password" value={form.manager_login_password} onChange={(e) => set('manager_login_password', e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            {form.manager_login_password && (
              <div className="field"><label>Confirm password</label>
                <input type="password" value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} autoComplete="new-password" />
              </div>
            )}
            {branch.manager_name && (
              <button type="button" className="btn ghost small" onClick={() => { setShowManagerFields(false); set('manager_login_password', ''); set('confirm_password', ''); }}>
                Cancel
              </button>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

function ControlCenterSection() {
  const [data, setData] = useState(null); // { roles, capabilities }
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState(''); // `${role}:${capability}` currently in flight

  function load() {
    controlCenterApi.get()
      .then(({ data }) => setData(data))
      .catch((err) => setError(extractError(err, 'Could not load the Control Center.')));
  }

  useEffect(() => { load(); }, []);

  async function toggle(capabilityId, role, nextAllowed) {
    const key = `${role}:${capabilityId}`;
    setSavingKey(key);
    setError('');
    // Flip the switch immediately rather than waiting on the round trip —
    // this is a single boolean write with nothing else depending on the
    // result, so optimistic update + roll-back-on-failure (see catch
    // below) reads better than a spinner for every toggle.
    setData((d) => ({
      ...d,
      capabilities: d.capabilities.map((c) => (
        c.id === capabilityId ? { ...c, roles: { ...c.roles, [role]: nextAllowed } } : c
      )),
    }));
    try {
      await controlCenterApi.update([{ role, capability: capabilityId, allowed: nextAllowed }]);
    } catch (err) {
      setError(extractError(err, 'Could not save that change — try again.'));
      load(); // roll back to whatever the server actually has
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div className="section">
      <div className="section-head"><h3>Control Center</h3></div>
      <div className="section-body">
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Decide what each role can do, across every branch. An owner or branch manager can always do
          everything within their own branch no matter what's set here — this only ever affects seller,
          reception, technician, attendant, and other logins.
        </div>
        {error && <div className="form-error">{error}</div>}
        {!data ? (
          <div className="empty">Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Capability</th>
                  {data.roles.map((role) => (
                    <th key={role} style={{ textAlign: 'center' }}>{STAFF_ROLE_LABEL[role] || role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.capabilities.map((cap) => (
                  <tr key={cap.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cap.label}</div>
                      <div className="field-hint">{cap.description}</div>
                    </td>
                    {data.roles.map((role) => {
                      const key = `${role}:${cap.id}`;
                      return (
                        <td key={role} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!cap.roles[role]}
                            disabled={savingKey === key}
                            onChange={(e) => toggle(cap.id, role, e.target.checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DevicesSection() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  function load() {
    devicesApi.list().then(({ data }) => setList(data.results || data)).catch((err) => setError(extractError(err, 'Could not load devices.')));
  }

  useEffect(() => { load(); }, []);

  async function unpair(device) {
    if (!window.confirm(
      device.device_type === 'desktop'
        ? `Remove "${device.name || 'this till'}"? The next person who logs in on that PC will re-pair it to their own branch — only do this if the PC changed branch or is being retired.`
        : `Remove "${device.name || 'this device'}"?`
    )) return;
    try {
      await devicesApi.remove(device.id);
      load();
    } catch (err) {
      setError(extractError(err, 'Could not remove this device.'));
    }
  }

  return (
    <div className="section">
      <div className="section-head"><h3>Paired devices</h3></div>
      <div className="section-body">
        {error && <div className="form-error">{error}</div>}
        {!list ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">No devices have connected yet — the desktop app pairs itself to this branch the first time someone logs in on it.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Device</th><th>Type</th><th>Last seen</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>{Icons.device} {d.name || (d.device_type === 'desktop' ? 'Till' : 'Device')}</td>
                  <td className="mono">{d.device_type}</td>
                  <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'Never'}</td>
                  <td><span className={`badge ${d.is_online ? 'good' : 'muted'}`}>{d.is_online ? 'Online' : 'Offline'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost small" onClick={() => unpair(d)}>{Icons.trash} Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
