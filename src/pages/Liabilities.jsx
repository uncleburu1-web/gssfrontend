import { useEffect, useState } from 'react';
import { liabilities, reports } from '../api/endpoints';
import { money, fmtDate } from '../utils/format';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

const CATEGORY_LABEL = {
  rent: 'Shop rent', loan: 'Loan', utility: 'Utility bill',
  salary: 'Staff salary owed', supplier_credit: 'Supplier credit', other: 'Other',
};

const emptyForm = { name: '', category: 'rent', amount: '', due_date: '', status: 'pending', notes: '' };

export default function Liabilities() {
  const [rows, setRows] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const [liabRes, nwRes] = await Promise.all([liabilities.list(), reports.netWorth()]);
    setRows(liabRes.data.results || liabRes.data);
    setNetWorth(nwRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await liabilities.create(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError('Could not save this liability — check the fields and try again.');
    }
  }

  async function toggleStatus(l) {
    await liabilities.update(l.id, { status: l.status === 'pending' ? 'paid' : 'pending' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this liability record?')) return;
    await liabilities.remove(id);
    load();
  }

  const riskRatio = netWorth && netWorth.assets > 0 ? netWorth.liabilities / netWorth.assets : (netWorth?.liabilities > 0 ? 1 : 0);
  const riskLevel = riskRatio >= 0.7 ? 'high' : riskRatio >= 0.4 ? 'moderate' : 'low';
  const riskLabel = riskLevel === 'high' ? 'High risk' : riskLevel === 'moderate' ? 'Moderate risk' : 'Low risk';
  const riskColor = riskLevel === 'high' ? 'var(--danger)' : riskLevel === 'moderate' ? 'var(--warn)' : 'var(--good)';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Liabilities</div>
          <div className="page-sub">What you owe, measured against what the shop is worth</div>
        </div>
      </div>

      {netWorth && (
        <div className="section">
          <div className="section-head"><h3>Net worth & risk</h3></div>
          <div className="section-body" style={{ paddingTop: 16 }}>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Assets (stock + receivables)</div><Amount className="stat-value mono" value={netWorth.assets} /></div>
              <div className="stat-card"><div className="stat-label">Liabilities (pending)</div><Amount className="stat-value mono warn" value={netWorth.liabilities} /></div>
              <div className="stat-card">
                <div className="stat-label">Net worth</div>
                <Amount
                  className={`stat-value mono ${netWorth.net_worth >= 0 ? 'good' : ''}`}
                  style={netWorth.net_worth < 0 ? { color: 'var(--danger)' } : undefined}
                  value={netWorth.net_worth}
                />
              </div>
              <div className="stat-card">
                <div className="stat-label">Risk level</div>
                <span className={`risk-label ${riskLevel}`}>{riskLabel}</span>
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <div className="risk-meter">
                <div className="risk-meter-fill" style={{ width: `${Math.min(100, riskRatio * 100)}%`, background: riskColor }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>
                Liabilities are {Math.round(riskRatio * 100)}% of assets. Above 70% is high risk — the shop owes nearly as much as (or more than) it's worth.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <h3>Liabilities ({rows.length})</h3>
          <button className="btn" onClick={openAdd}>{Icons.plus} Add liability</button>
        </div>
        <div className="section-body">
          {loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">No liabilities recorded — rent, loans, or bills you add here will show up against your net worth.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Amount</th><th>Due date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}>
                      <td>{l.name}</td>
                      <td>{CATEGORY_LABEL[l.category] || l.category}</td>
                      <td className="num">{money(l.amount)}</td>
                      <td className="mono">{fmtDate(l.due_date)}</td>
                      <td>
                        <span className={`badge ${l.status === 'paid' ? 'collected' : 'diagnosing'}`}>
                          <span className="ledot" />{l.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn small ghost" onClick={() => toggleStatus(l)}>
                            Mark {l.status === 'paid' ? 'pending' : 'paid'}
                          </button>
                          <button className="btn small danger" onClick={() => handleDelete(l.id)}>{Icons.trash}</button>
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
            <h3>Add a liability</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shop rent — August" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (₦)</label>
                  <input required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Due date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Add liability</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
