import { useEffect, useState } from 'react';
import { workers as workersApi } from '../api/endpoints';
import { money, fmtDate } from '../utils/format';
import { Icons } from '../components/Icons';

const ROLE_LABEL = {
  owner: 'Owner / Admin', seller: 'Seller', technician: 'Service technician',
  attendant: 'Shop attendant', other: 'Other',
};

const emptyForm = {
  full_name: '', role: 'seller', phone: '', salary: '', hire_date: '',
  notes: '', give_login: true, login_username: '', login_password: '',
};

export default function Workers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await workersApi.list();
    setRows(data.results || data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(worker) {
    setEditing(worker);
    setForm({
      full_name: worker.full_name, role: worker.role, phone: worker.phone || '',
      salary: worker.salary || '', hire_date: worker.hire_date || '', notes: worker.notes || '',
      give_login: worker.can_login, login_username: worker.username || '', login_password: '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      full_name: form.full_name, role: form.role, phone: form.phone,
      salary: form.salary || null, hire_date: form.hire_date || null, notes: form.notes,
    };
    if (form.give_login && form.login_username) {
      payload.login_username = form.login_username;
      if (form.login_password) payload.login_password = form.login_password;
    }
    try {
      if (editing) {
        await workersApi.update(editing.id, payload);
      } else {
        if (form.give_login && !form.login_password) {
          setError('Set a password for this worker\'s login.');
          return;
        }
        await workersApi.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      setError((data && (data.login_username?.[0] || data.non_field_errors?.[0])) || 'Could not save this worker — check the fields and try again.');
    }
  }

  async function toggleActive(w) {
    await workersApi.update(w.id, { is_active: !w.is_active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this worker record? Their login (if any) will stop working.')) return;
    await workersApi.remove(id);
    load();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Workers</div>
          <div className="page-sub">Sellers who can log in and sell, plus your general staff roster</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Workers ({rows.length})</h3>
          <button className="btn" onClick={openAdd}>{Icons.plus} Add worker</button>
        </div>
        <div className="section-body">
          {loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">No workers yet. Add a seller to give them a login, or add other staff just to keep track of them.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Hired</th><th>Login</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.full_name}</td>
                      <td><span className={`pill ${w.role}`}>{ROLE_LABEL[w.role] || w.role}</span></td>
                      <td>{w.phone || '—'}</td>
                      <td className="num">{w.salary ? money(w.salary) : '—'}</td>
                      <td className="mono">{fmtDate(w.hire_date)}</td>
                      <td className="mono">{w.can_login ? w.username : '—'}</td>
                      <td>
                        <span className={`badge ${w.is_active ? 'ready' : 'collected'}`}>
                          <span className="ledot" />{w.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn small ghost" onClick={() => toggleActive(w)}>{w.is_active ? 'Deactivate' : 'Activate'}</button>
                          <button className="btn small ghost" onClick={() => openEdit(w)}>{Icons.edit}</button>
                          <button className="btn small danger" onClick={() => handleDelete(w.id)}>{Icons.trash}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit worker' : 'Add worker'}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Full name</label>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {Object.entries(ROLE_LABEL).filter(([v]) => v !== 'owner').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Salary (₦, optional)</label>
                  <input type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                </div>
                <div className="field">
                  <label>Hire date</label>
                  <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
                </div>
              </div>

              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox" style={{ width: 'auto' }} checked={form.give_login}
                  disabled={editing?.can_login}
                  onChange={(e) => setForm({ ...form, give_login: e.target.checked })}
                />
                <label style={{ margin: 0 }}>Give this worker a system login (so they can sell)</label>
              </div>

              {form.give_login && (
                <div className="field-row">
                  <div className="field">
                    <label>Username</label>
                    <input
                      required={!editing} disabled={!!editing?.can_login} value={form.login_username}
                      onChange={(e) => setForm({ ...form, login_username: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>{editing ? 'New password (leave blank to keep)' : 'Password'}</label>
                    <input
                      type="password" required={!editing} value={form.login_password}
                      onChange={(e) => setForm({ ...form, login_password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">{editing ? 'Save changes' : 'Add worker'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
